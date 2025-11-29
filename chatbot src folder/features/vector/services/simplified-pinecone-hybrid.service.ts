import { logger } from "../../../utils/logger";
import HttpException from "../../../exceptions/HttpException";
import { IVectorSearchResult } from "../vector.interface";
import { SmartCacheService } from "../../../utils/smart-cache.service";
import { Pinecone } from "@pinecone-database/pinecone";
import { vectorConfig } from "../../../config/vector.config";
import { cacheConfig } from "../../../config/feature-cache.config";
import { searchConfig } from "../../../config/search.config";

// Initialize Pinecone client for inference API
const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });

/**
 * SimplifiedPineconeHybridSearchService - Simplified hybrid search using existing infrastructure
 * 
 * This implementation:
 * 1. Uses existing dense search (semantic) from vector service
 * 2. Adds proper sparse search using Pinecone's sparse embedding
 * 3. Merges and deduplicates results
 * 4. Works with current Pinecone index setup
 */
class SimplifiedPineconeHybridSearchService {
  private hybridCacheService = new SmartCacheService("pinecone_hybrid");
  
  // Cache configurations for performance
  private readonly CACHE_TTL_HYBRID_RESULTS = cacheConfig.vector.search.hybridResultsTTL;
  
  /**
   * Perform simplified hybrid search using existing vector service + sparse search
   */
  public async performHybridSearch(
    denseResults: IVectorSearchResult[], // Results from existing vector service
    query: string,
    namespace: any,
    options?: {
      topK?: number;
      denseWeight?: number; // Weight for semantic search (0-1, default 0.7)
      sparseWeight?: number; // Weight for lexical search (0-1, default 0.3)
      includeMetadata?: boolean;
      filter?: any;
      minSimilarity?: number;
      enableCache?: boolean;
    }
  ): Promise<IVectorSearchResult[]> {
    try {
    const topK = options?.topK || 20;
    const denseWeight = options?.denseWeight || searchConfig.hybrid.defaultDenseWeight;
    const sparseWeight = options?.sparseWeight || searchConfig.hybrid.defaultSparseWeight;      // Check cache first
      if (options?.enableCache !== false) {
        const cacheKey = `simplified_hybrid:${query}:${topK}:${denseWeight}:${sparseWeight}`;
        const cached = await this.hybridCacheService.get(cacheKey);
        if (cached) {
          const cachedResults = cached as IVectorSearchResult[];
          return cachedResults;
        }
      }

      // Log the search strategy being used
      logger.info(`🔍 Starting simplified Pinecone hybrid search: dense(${denseWeight}) + sparse(${sparseWeight})`);
      
      // Step 1: We already have dense results from existing vector service
      // Step 2: Perform sparse (lexical) search  
      const sparseResults = await this.performSparseSearch(query, namespace, {
        topK: Math.round(topK * searchConfig.hybrid.hybridTopKMultiplier), // Get more candidates for merging
        filter: options?.filter,
        includeMetadata: options?.includeMetadata,
      });

      // Step 3: Merge and deduplicate results
      const mergedResults = this.mergeAndDeduplicateResults(
        denseResults,
        sparseResults,
        denseWeight,
        sparseWeight
      );

      // Step 4: Apply minimum similarity filter if specified
      let filteredResults = options?.minSimilarity
        ? mergedResults.filter((result) => result.score >= options.minSimilarity!)
        : mergedResults;

      // IMPORTANT FIX: If we have no sparse results, don't penalize dense results too much
      if (sparseResults.length === 0 && filteredResults.length === 0 && denseResults.length > 0) {
        logger.warn(`⚠️ No sparse results found, falling back to adjusted dense results`);
        // Use dense results with a more balanced weighting
        filteredResults = denseResults.map(result => ({
          ...result,
          score: result.score * searchConfig.hybrid.sparseFallbackPenalty, // Slight penalty but not too harsh
          metadata: {
            ...result.metadata,
            hybridInfo: {
              denseScore: result.score,
              sparseScore: 0,
              denseWeight: searchConfig.hybrid.fallbackDenseWeight,
              sparseWeight: searchConfig.hybrid.fallbackSparseWeight,
              sources: ['dense'],
              fallbackMode: true
            }
          }
        }));
      }

      // Step 5: Sort by final hybrid score and limit to topK
      const finalResults = filteredResults
        .sort((a, b) => b.score - a.score)
        .slice(0, topK);

      logger.info(
        `✅ Simplified hybrid search complete: ${denseResults.length} dense + ${sparseResults.length} sparse → ${finalResults.length} final results`
      );

      // Cache the results
      if (options?.enableCache !== false && finalResults.length > 0) {
        const cacheKey = `simplified_hybrid:${query}:${topK}:${denseWeight}:${sparseWeight}`;
        await this.hybridCacheService.set(
          cacheKey,
          finalResults,
          this.CACHE_TTL_HYBRID_RESULTS
        );
      }

      return finalResults;

    } catch (error: any) {
      logger.error(`❌ Error in simplified hybrid search:`, error);
      // Return original dense results on error
      return denseResults.slice(0, options?.topK || 20);
    }
  }

  /**
   * Perform sparse (lexical) vector search with simplified error handling
   */
  private async performSparseSearch(
    query: string,
    namespace: any,
    options: {
      topK: number;
      filter?: any;
      includeMetadata?: boolean;
    }
  ): Promise<IVectorSearchResult[]> {
    try {
      // Try Pinecone sparse embedding
      const sparseEmbedding = await pc.inference.embed(
        "pinecone-sparse-english-v0",
        [query],
        { input_type: "query", truncate: "END" }
      );

      // Extract sparse data with simplified parsing
      const embeddingData = Array.isArray(sparseEmbedding) ? sparseEmbedding[0] : sparseEmbedding;
      const sparseData = embeddingData?.data?.[0] || embeddingData?.data || embeddingData;

      if (!sparseData?.sparseIndices || !sparseData?.sparseValues) {
        logger.debug("Sparse embedding failed, falling back to keyword search");
        return this.performKeywordBasedSearch(query, namespace, options);
      }

      // Perform sparse search
      const response = await namespace.query({
        topK: options.topK,
        vector: new Array(1024).fill(0), // Dummy dense vector - matches BGE-M3 dimension
        sparseVector: {
          indices: sparseData.sparseIndices,
          values: sparseData.sparseValues
        },
        filter: options.filter,
        includeMetadata: true,
      });

      // Transform results
      return response.matches?.map((match: any) => ({
        id: match.id,
        text: match.metadata?.text || "",
        score: match.score,
        metadata: options.includeMetadata !== false ? {
          category: match.metadata?.category,
          sourceId: match.metadata?.sourceId,
          sourceType: match.metadata?.sourceType,
          chunkIndex: match.metadata?.chunkIndex,
          totalChunks: match.metadata?.totalChunks,
          documentTitle: match.metadata?.documentTitle,
          sectionTitle: match.metadata?.sectionTitle,
          originalScore: match.score,
        } : undefined,
      })) || [];

    } catch (error: any) {
      const errorMessage = error.message || '';
      if (errorMessage.includes('Index configuration does not support sparse values')) {
        logger.debug("Sparse search not supported, using keyword fallback");
      } else {
        logger.warn(`Sparse search failed: ${errorMessage}`);
      }
      return this.performKeywordBasedSearch(query, namespace, options);
    }
  }

  /**
   * Simplified keyword-based fallback search
   */
  private async performKeywordBasedSearch(
    query: string,
    namespace: any,
    options: {
      topK: number;
      filter?: any;
      includeMetadata?: boolean;
    }
  ): Promise<IVectorSearchResult[]> {
    try {
      // Simple keyword extraction (already inlined from extractKeywords)
      const stopWords = new Set([
        'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
        'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
        'will', 'would', 'could', 'should', 'what', 'where', 'when', 'why', 'how', 'who', 'which',
        'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him',
        'her', 'us', 'them', 'my', 'your', 'his', 'her', 'its', 'our', 'their', 'about', 'tell'
      ]);

      const keywords = query
        .toLowerCase()
        .replace(/[^\w\s-]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 2 && !stopWords.has(word))
        .slice(0, 3); // Limit to 3 keywords for simplicity

      if (keywords.length === 0) return [];

      // Use first keyword for simple embedding-based search
      const keywordEmbedding = await pc.inference.embed(
        "multilingual-e5-large",
        [keywords[0]],
        { input_type: "query", truncate: "END" }
      );

      if (!keywordEmbedding?.[0]?.values) return [];

      const response = await namespace.query({
        topK: options.topK,
        vector: keywordEmbedding[0].values,
        filter: options.filter,
        includeMetadata: true,
      });

      return response.matches?.map((match: any) => ({
        id: match.id,
        text: match.metadata?.text || "",
        score: match.score * searchConfig.hybrid.keywordScorePenalty, // Reduce score for keyword-based results
        metadata: options.includeMetadata !== false ? {
          category: match.metadata?.category,
          sourceId: match.metadata?.sourceId,
          sourceType: match.metadata?.sourceType,
          chunkIndex: match.metadata?.chunkIndex,
          totalChunks: match.metadata?.totalChunks,
          documentTitle: match.metadata?.documentTitle,
          sectionTitle: match.metadata?.sectionTitle,
          originalScore: match.score,
          searchKeyword: keywords[0],
        } : undefined,
      })) || [];

    } catch (error: any) {
      logger.error(`❌ Keyword-based search failed:`, error);
      return [];
    }
  }

  /**
   * Extract keywords from query for fallback search
   */
  private extractKeywords(query: string): string[] {
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
      'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
      'will', 'would', 'could', 'should', 'what', 'where', 'when', 'why', 'how', 'who', 'which',
      'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him',
      'her', 'us', 'them', 'my', 'your', 'his', 'her', 'its', 'our', 'their', 'about', 'tell'
    ]);

    return query
      .toLowerCase()
      .replace(/[^\w\s-]/g, ' ') // Keep alphanumeric, spaces, and hyphens
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word)) // Filter out short words and stop words
      .slice(0, 5); // Limit to 5 keywords for performance
  }

  /**
   * Merge and deduplicate results from dense and sparse searches
   */
  private mergeAndDeduplicateResults(
    denseResults: IVectorSearchResult[],
    sparseResults: IVectorSearchResult[],
    denseWeight: number,
    sparseWeight: number
  ): IVectorSearchResult[] {
    const resultMap = new Map<string, IVectorSearchResult>();

    // If we have no sparse results, adjust weights to prevent zero scores
    const adjustedDenseWeight = sparseResults.length === 0 ? 1.0 : denseWeight;
    const adjustedSparseWeight = sparseResults.length === 0 ? 0.0 : sparseWeight;

    // Add dense results with weighted scores
    denseResults.forEach((result) => {
      resultMap.set(result.id, {
        ...result,
        score: result.score * adjustedDenseWeight,
        metadata: {
          ...result.metadata,
          hybridInfo: {
            denseScore: result.score,
            sparseScore: 0,
            denseWeight: adjustedDenseWeight,
            sparseWeight: adjustedSparseWeight,
            sources: ['dense']
          }
        }
      });
    });

    // Merge sparse results, combining scores for duplicates
    sparseResults.forEach((result) => {
      const existing = resultMap.get(result.id);
      if (existing) {
        // Combine scores: existing dense + new sparse
        existing.score += result.score * sparseWeight;
        // Update hybrid info
        if (existing.metadata?.hybridInfo) {
          existing.metadata.hybridInfo.sparseScore = result.score;
          existing.metadata.hybridInfo.sources.push('sparse');
        }
        // Use the text from whichever result has it
        if (!existing.text && result.text) {
          existing.text = result.text;
        }
      } else {
        // New result from sparse search only
        resultMap.set(result.id, {
          ...result,
          score: result.score * sparseWeight,
          metadata: {
            ...result.metadata,
            hybridInfo: {
              denseScore: 0,
              sparseScore: result.score,
              denseWeight,
              sparseWeight,
              sources: ['sparse']
            }
          }
        });
      }
    });

    const mergedResults = Array.from(resultMap.values());
    
    logger.info(
      `✅ Simplified hybrid search complete: ${denseResults.length} dense + ${sparseResults.length} sparse → ${mergedResults.length} final results`
    );

    return mergedResults;
  }

  /**
   * Get optimal weights based on query characteristics
   * Returns balanced weights favoring semantic search for most queries
   */
  public getOptimalWeights(query: string): { denseWeight: number; sparseWeight: number } {
    // Analyze query characteristics to determine optimal weights
    const queryLower = query.toLowerCase();
    
    // For questions with specific keywords, increase sparse weight
    const hasSpecificTerms = /\b(what|who|where|when|how many|market share|competitors?|partnerships?|universities?|corporations?)\b/i.test(query);
    const hasNumbers = /\d+/.test(query);
    const hasProperNouns = /[A-Z][a-z]+/.test(query);
    
    if (hasSpecificTerms || hasNumbers || hasProperNouns) {
      // Favor sparse search for keyword-heavy queries
      return { 
        denseWeight: 0.6, 
        sparseWeight: 0.4 
      };
    }
    
    // Default balanced weights
    return { 
      denseWeight: searchConfig.hybrid.defaultDenseWeight, 
      sparseWeight: searchConfig.hybrid.defaultSparseWeight 
    };
  }

  /**
   * Clear hybrid search cache
   */
  public async clearCache(): Promise<void> {
    await this.hybridCacheService.clear();
    logger.info("✅ Simplified hybrid search cache cleared");
  }
}

export default SimplifiedPineconeHybridSearchService;