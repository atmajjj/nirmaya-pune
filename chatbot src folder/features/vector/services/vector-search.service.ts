import { IVectorSearchResult } from "../vector.interface";
import HttpException from "../../../exceptions/HttpException";
import { logger } from "../../../utils/logger";
import { chatbotIndex } from "../../../utils/pinecone";
import RerankerService from "./reranker.service";
import unifiedCacheService from "./unified-cache.service";
import SimplifiedPineconeHybridSearchService from "./simplified-pinecone-hybrid.service";
import BGEM3EmbeddingService from "./bge-m3-embedding.service";
import type { RecordMetadata } from "@pinecone-database/pinecone";
import { vectorConfig } from "../../../config/vector.config";
import { searchConfig } from "../../../config/search.config";
import { VectorUtils } from "../vector.utils";

// Define the structure of Pinecone search records
interface PineconeRecord {
  id: string;
  score: number;
  metadata?: RecordMetadata;
}

/**
 * Service responsible for vector search operations and algorithms
 */
class VectorSearchService {
  private rerankerService = new RerankerService();
  private simplifiedPineconeHybridService = new SimplifiedPineconeHybridSearchService();
  private bgeM3Service = new BGEM3EmbeddingService();

  /**
   * Enhanced semantic search with semantic chunk metadata
   */
  public async searchSimilar(
    query: string,
    userId: number,
    agentId?: number,
    options?: {
      topK?: number;
      includeMetadata?: boolean;
      filterByStrategy?: string;
      sourceType?: string;
      minSimilarity?: number;
    }
  ): Promise<IVectorSearchResult[]> {
    try {
      if (!userId) {
        throw new HttpException(400, "User ID is required for vector search");
      }

      const namespaceName = VectorUtils.generateNamespaceName(userId, agentId);
      logger.info(`🔀 Using namespace: ${namespaceName}`);
      const namespace = chatbotIndex.namespace(namespaceName);
      const topK = options?.topK || searchConfig.parameters.defaultTopK;

      logger.info(
        `🔍 Searching ${topK} vectors in namespace for agent ${agentId}${options?.sourceType ? ` filtered by sourceType: ${options.sourceType}` : ''}`
      );

      // Build filter object for Pinecone query
      const filter: Record<string, unknown> = {};
      if (options?.filterByStrategy) {
        filter.chunkingStrategy = { $eq: options.filterByStrategy };
      }
      if (options?.sourceType) {
        filter.sourceType = { $eq: options.sourceType };
      }

      // Generate BGE-M3 embedding for the query
      const queryEmbedding = await this.bgeM3Service.embedText(query);

      // Use regular query with pre-computed BGE-M3 embedding
      const pineconeResponse = await namespace.query({
        vector: queryEmbedding,
        topK,
        filter: Object.keys(filter).length > 0 ? filter : undefined,
        includeMetadata: true,
      });

      // Transform Pinecone response to enhanced format (SDK v6 structure)
      const results: IVectorSearchResult[] =
        pineconeResponse.matches?.map((match: any) => ({
          id: match.id,
          text: (match.metadata?.text as string) || "",
          score: match.score,
          metadata:
            options?.includeMetadata !== false
              ? {
                  category: match.metadata?.category as string,
                  sourceId: match.metadata?.sourceId as number,
                  sourceType: match.metadata?.sourceType as string,
                  chunkIndex: match.metadata?.chunkIndex as number,
                  totalChunks: match.metadata?.totalChunks as number,
                  breakpointScore: match.metadata?.breakpointScore as number,
                  similarity: match.metadata?.similarity as number,
                  chunkingStrategy: match.metadata?.chunkingStrategy as string,
                  startPosition: match.metadata?.startPosition as number,
                  endPosition: match.metadata?.endPosition as number,
                  // Enhanced contextual metadata (flattened)
                  documentTitle: match.metadata?.documentTitle as string,
                  documentSummary: match.metadata?.documentSummary as string,
                  sectionTitle: match.metadata?.sectionTitle as string,
                  precedingContext: match.metadata?.precedingContext as string,
                  followingContext: match.metadata?.followingContext as string,
                  documentFileType: match.metadata?.documentFileType as string,
                  documentLanguage: match.metadata?.documentLanguage as string,
                  documentWordCount: match.metadata?.documentWordCount as number,
                  documentCreatedDate: match.metadata?.documentCreatedDate as string,
                }
              : undefined,
        })) || [];

      // Filter by minimum similarity if specified
      const filteredResults = options?.minSimilarity
        ? results.filter((result) => result.score >= options.minSimilarity!)
        : results;

      logger.info(`✅ Found ${filteredResults.length} relevant vectors`);
      return filteredResults;
    } catch (error: unknown) {
      logger.error(`❌ Error searching vectors:`, error);
      if (error instanceof HttpException) throw error;
      throw new HttpException(500, `Error searching vectors: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Search with reranking
   */
  public async searchSimilarWithReranking(
    query: string,
    userId: number,
    agentId?: number,
    options?: {
      topK?: number;
      includeMetadata?: boolean;
      filterByStrategy?: string;
      sourceType?: string;
      minSimilarity?: number;
      enableReranking?: boolean;
      rerankModel?: string;
      rerankTopN?: number;
      rerankThreshold?: number;
      prioritizeSpeed?: boolean;
    }
  ): Promise<IVectorSearchResult[]> {
    try {
      if (!userId) {
        throw new HttpException(400, "User ID is required for vector search");
      }

      // Check cache first if reranking is enabled and agentId is provided
      if (options?.enableReranking !== false && agentId) {
        const cached = await unifiedCacheService.getRerankedResults(
          query,
          userId,
          agentId
        );
        if (cached) {
          logger.debug(`✅ Returning ${cached.length} cached reranked results`);
          return cached;
        }
      }

      // Get initial search results with larger topK for reranking
      const initialTopK =
        options?.enableReranking !== false
          ? Math.max(options?.topK || 10, searchConfig.parameters.minTopK)
          : options?.topK || 10;

      const initialResults = await this.searchSimilar(query, userId, agentId, {
        ...options,
        topK: initialTopK,
      });

      // Skip reranking if disabled or insufficient results
      if (options?.enableReranking === false || initialResults.length <= 1) {
        logger.info(
          `⚡ Skipping reranking - returning ${initialResults.length} results`
        );
        return initialResults.slice(0, options?.topK || 10);
      }

      // Select optimal reranking model if not specified
      const rerankModel =
        options?.rerankModel ||
        this.rerankerService.selectOptimalModel(query, options?.prioritizeSpeed);

      // Apply reranking
      logger.info(`🎯 Applying reranking with model: ${rerankModel}`);

      const rerankedResults = await this.rerankerService.rerankResults(
        query,
        initialResults,
        {
          model: rerankModel,
          topN: options?.rerankTopN || options?.topK || 10,
          scoreThreshold: options?.rerankThreshold,
          includeOriginalScores: true,
        }
      );

      logger.info(
        `✅ Reranking complete: ${initialResults.length} → ${rerankedResults.length} results`
      );

      // Cache the reranked results if agentId is provided
      if (agentId && rerankedResults.length > 0) {
        await unifiedCacheService.setRerankedResults(
          query,
          userId,
          agentId,
          rerankedResults
        );
      }

      return rerankedResults;
    } catch (error: unknown) {
      logger.error(`❌ Error in enhanced search with reranking:`, error);

      // Fallback to regular search on error
      logger.warn(`⚠️ Falling back to regular search`);
      return await this.searchSimilar(query, userId, agentId, {
        topK: options?.topK,
        includeMetadata: options?.includeMetadata,
        filterByStrategy: options?.filterByStrategy,
        minSimilarity: options?.minSimilarity,
      });
    }
  }

  /**
   * Search using Official Pinecone Hybrid Search implementation
   */
  public async searchSimilarWithPineconeHybrid(
    query: string,
    userId: number,
    agentId?: number,
    options?: {
      topK?: number;
      denseWeight?: number;
      sparseWeight?: number;
      includeMetadata?: boolean;
      filterByStrategy?: string;
      sourceType?: string;
      minSimilarity?: number;
      enableCache?: boolean;
      enableReranking?: boolean;
      rerankModel?: string;
      rerankTopN?: number;
    }
  ): Promise<IVectorSearchResult[]> {
    try {
      logger.debug(`🔍🔍 DEBUG: searchSimilarWithPineconeHybrid called for query: "${query.substring(0, 50)}..."`);
      
      if (!userId) {
        throw new HttpException(400, "User ID is required for vector search");
      }

      // Get optimal weights based on query characteristics
      const weights = this.simplifiedPineconeHybridService.getOptimalWeights(query);
      const denseWeight = options?.denseWeight || weights.denseWeight;
      const sparseWeight = options?.sparseWeight || weights.sparseWeight;

      logger.info(
        `🔍 Simplified Pinecone hybrid search for agent ${agentId}: dense(${denseWeight}) + sparse(${sparseWeight})`
      );

      // Get namespace for this user-agent combination
      const namespaceName = VectorUtils.generateNamespaceName(userId, agentId);
      logger.info(`🔀 Using namespace: ${namespaceName}`);
      const namespace = chatbotIndex.namespace(namespaceName);

      // Build filter for source type if specified
      let filter: Record<string, unknown> | undefined = undefined;
      if (options?.sourceType) {
        filter = { sourceType: { $eq: options.sourceType } };
      }
      if (options?.filterByStrategy) {
        filter = {
          ...filter,
          chunkingStrategy: { $eq: options.filterByStrategy }
        };
      }

      // First get dense results using existing vector search
      const denseResults = await this.searchSimilar(query, userId, agentId, {
        topK: Math.round((options?.topK || 20) * searchConfig.hybrid.hybridTopKMultiplier),
        includeMetadata: options?.includeMetadata,
        filterByStrategy: options?.filterByStrategy,
        sourceType: options?.sourceType,
        minSimilarity: options?.minSimilarity,
      });

      if (denseResults.length === 0) {
        logger.info("No dense results found for hybrid search");
        return [];
      }

      // Perform simplified Pinecone hybrid search combining dense + sparse
      const hybridResults = await this.simplifiedPineconeHybridService.performHybridSearch(
        denseResults,
        query,
        namespace,
        {
          topK: options?.topK || 20,
          denseWeight,
          sparseWeight,
          includeMetadata: options?.includeMetadata,
          filter,
          minSimilarity: options?.minSimilarity,
          enableCache: options?.enableCache,
        }
      );

      // Apply reranking if enabled
      if (options?.enableReranking !== false && hybridResults.length > 1) {
        const rerankModel = options?.rerankModel || "bge-reranker-v2-m3";
        
        logger.info(`🏆 Applying reranking with model: ${rerankModel}`);
        
        const rerankedResults = await this.rerankerService.rerankResults(
          query,
          hybridResults,
          {
            model: rerankModel,
            topN: options?.rerankTopN || Math.min(10, hybridResults.length),
          }
        );

        logger.debug(`✅ Reranking complete: ${rerankedResults.length} results`);
        return rerankedResults;
      }

      logger.debug(`🔍🔍 DEBUG: Simplified Pinecone hybrid search returned ${hybridResults.length} results`);

      if (hybridResults.length === 0) {
        logger.info("No hybrid results found");
        return [];
      }

      logger.info(
        `✅ Simplified Pinecone hybrid search complete: ${hybridResults.length} results with scores ${hybridResults[0]?.score?.toFixed(3)} to ${hybridResults[hybridResults.length - 1]?.score?.toFixed(3)}`
      );

      return hybridResults;

    } catch (error: unknown) {
      logger.error(`❌ Error in Pinecone hybrid search:`, error);
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        500,
        `Pinecone hybrid search failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Clear all search-related caches
   */
  public async clearCache(): Promise<void> {
    try {
      // Clear hybrid search cache
      await this.simplifiedPineconeHybridService.clearCache();
      // Clear unified cache for vector search results
      await unifiedCacheService.clearAllCaches();
      logger.info(`✅ Vector search caches cleared successfully`);
    } catch (error: unknown) {
      logger.error(`❌ Error clearing vector search caches:`, error);
      // Don't throw error for cache clearing failure
    }
  }
}

export default VectorSearchService;
