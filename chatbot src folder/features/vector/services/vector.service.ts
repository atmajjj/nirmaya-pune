import { IVectorRecord, IVectorSearchResult } from "../vector.interface";
import HttpException from "../../../exceptions/HttpException";
import { logger } from "../../../utils/logger";
import { chatbotIndex } from "../../../utils/pinecone";
import type { Index } from "@pinecone-database/pinecone";

// Import specialized services
import VectorOperationsService from "./vector-operations.service";
import VectorSearchService from "./vector-search.service";
import VectorStatisticsService from "./vector-statistics.service";
import { vectorConfig } from "../../../config/vector.config";
import { VectorUtils } from "../vector.utils";

/**
 * Main Vector Service - Orchestrates vector operations using specialized services
 * Refactored from 782 lines to use modular architecture
 */
class VectorService {
  // Specialized service instances
  private operationsService = new VectorOperationsService();
  private searchService = new VectorSearchService();
  private statisticsService = new VectorStatisticsService();

  // ========================
  // NAMESPACE OPERATIONS
  // ========================

  /**
   * Generate namespace name for user-agent combination
   */
  public generateNamespaceName(userId: number, agentId?: number): string {
    return VectorUtils.generateNamespaceName(userId, agentId);
  }

  /**
   * Get namespace instance for agent with proper isolation
   */
  public getNamespace(userId: number, agentId?: number): ReturnType<Index['namespace']> {
    const namespaceName = this.generateNamespaceName(userId, agentId);
    logger.info(`🔀 Using namespace: ${namespaceName}`);
    return chatbotIndex.namespace(namespaceName);
  }

  // ========================
  // VECTOR OPERATIONS
  // ========================

  /**
   * Upsert records into a specific namespace with proper user-agent isolation
   */
  public async upsertRecords(
    records: IVectorRecord[],
    userId?: number,
    agentId?: number
  ): Promise<void> {
    try {
      if (!userId) {
        throw new HttpException(400, "User ID is required for vector operations");
      }

      await this.operationsService.upsertRecords(records, userId, agentId);
      
      // Clear caches after upsert to ensure fresh search results
      await this.statisticsService.clearStatisticsCache(userId, agentId);
      await this.clearSearchCache();
      
      logger.info(`✅ Upsert operation completed for ${records.length} records`);
    } catch (error: unknown) {
      logger.error(`❌ Error in vector upsert:`, error);
      if (error instanceof HttpException) throw error;
      throw new HttpException(500, `Vector upsert failed: ${error instanceof Error ? error instanceof Error ? error.message : 'Unknown error' : 'Unknown error'}`);
    }
  }

  /**
   * Delete all vectors for a specific agent
   */
  public async deleteAgentVectors(userId: number, agentId: number): Promise<void> {
    try {
      await this.operationsService.deleteAgentVectors(userId, agentId);
      
      // Clear caches after deletion to ensure fresh search results
      await this.statisticsService.clearStatisticsCache(userId, agentId);
      await this.clearSearchCache();
      
      logger.info(`✅ Agent vectors deletion completed for agent ${agentId}`);
    } catch (error: unknown) {
      logger.error(`❌ Error deleting agent vectors:`, error);
      if (error instanceof HttpException) throw error;
      throw new HttpException(500, `Agent vector deletion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete all vectors for a user
   */
  public async deleteUserVectors(userId: number): Promise<void> {
    try {
      await this.operationsService.deleteUserVectors(userId);
      
      // Clear all caches for user after deletion
      await this.statisticsService.clearStatisticsCache(userId);
      await this.clearSearchCache();
      
      logger.info(`✅ User vectors deletion completed for user ${userId}`);
    } catch (error: unknown) {
      logger.error(`❌ Error deleting user vectors:`, error);
      if (error instanceof HttpException) throw error;
      throw new HttpException(500, `User vector deletion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Fetch specific vectors by IDs
   */
  public async fetchVectors(
    ids: string[],
    userId: number,
    agentId?: number
  ): Promise<IVectorSearchResult[]> {
    try {
      const fetchResponse = await this.operationsService.fetchVectors(ids, userId, agentId);
      
      // Transform FetchResponse to IVectorSearchResult[]
      const results: IVectorSearchResult[] = [];
      if (fetchResponse.records) {
        for (const [id, record] of Object.entries(fetchResponse.records)) {
          if (record) {
            results.push({
              id,
              text: (record.metadata?.text as string) || "",
              score: 1.0, // No score available from fetch operation
              metadata: record.metadata ? {
                category: record.metadata.category as string,
                sourceId: record.metadata.sourceId as number,
                sourceType: record.metadata.sourceType as string,
                chunkIndex: record.metadata.chunkIndex as number,
                totalChunks: record.metadata.totalChunks as number,
                breakpointScore: record.metadata.breakpointScore as number,
                similarity: record.metadata.similarity as number,
                chunkingStrategy: record.metadata.chunkingStrategy as string,
                startPosition: record.metadata.startPosition as number,
                endPosition: record.metadata.endPosition as number,
                documentTitle: record.metadata.documentTitle as string,
                documentSummary: record.metadata.documentSummary as string,
                sectionTitle: record.metadata.sectionTitle as string,
                precedingContext: record.metadata.precedingContext as string,
                followingContext: record.metadata.followingContext as string,
                documentFileType: record.metadata.documentFileType as string,
                documentLanguage: record.metadata.documentLanguage as string,
                documentWordCount: record.metadata.documentWordCount as number,
                documentCreatedDate: record.metadata.documentCreatedDate as string,
              } : undefined,
            });
          }
        }
      }
      
      return results;
    } catch (error: unknown) {
      logger.error(`❌ Error fetching vectors:`, error);
      if (error instanceof HttpException) throw error;
      throw new HttpException(500, `Vector fetch failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete specific vectors by IDs
   */
  public async deleteVectors(
    ids: string[],
    userId: number,
    agentId?: number
  ): Promise<void> {
    try {
      await this.operationsService.deleteVectors(ids, userId, agentId);
      
      // Clear statistics cache after deletion
      await this.statisticsService.clearStatisticsCache(userId, agentId);
      
      logger.info(`✅ Specific vectors deletion completed for ${ids.length} vectors`);
    } catch (error: unknown) {
      logger.error(`❌ Error deleting specific vectors:`, error);
      if (error instanceof HttpException) throw error;
      throw new HttpException(500, `Vector deletion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete all vectors in a namespace
   */
  public async deleteAllVectors(userId: number, agentId?: number): Promise<void> {
    try {
      await this.operationsService.deleteAllVectors(userId, agentId);
      
      // Clear statistics cache after deletion
      await this.statisticsService.clearStatisticsCache(userId, agentId);
      
      logger.info(`✅ All vectors deletion completed`);
    } catch (error: unknown) {
      logger.error(`❌ Error deleting all vectors:`, error);
      if (error instanceof HttpException) throw error;
      throw new HttpException(500, `All vector deletion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ========================
  // SEARCH OPERATIONS
  // ========================

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
      return await this.searchService.searchSimilar(query, userId, agentId, options);
    } catch (error: unknown) {
      logger.error(`❌ Error in semantic search:`, error);
      if (error instanceof HttpException) throw error;
      throw new HttpException(500, `Semantic search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
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
      return await this.searchService.searchSimilarWithReranking(
        query,
        userId,
        agentId,
        options
      );
    } catch (error: unknown) {
      logger.error(`❌ Error in reranking search:`, error);
      if (error instanceof HttpException) throw error;
      throw new HttpException(500, `Reranking search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
      return await this.searchService.searchSimilarWithPineconeHybrid(
        query,
        userId,
        agentId,
        options
      );
    } catch (error: unknown) {
      logger.error(`❌ Error in Pinecone hybrid search:`, error);
      if (error instanceof HttpException) throw error;
      throw new HttpException(500, `Pinecone hybrid search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ========================
  // STATISTICS OPERATIONS
  // ========================

  /**
   * Get vector count for a specific agent
   */
  public async getVectorCount(userId: number, agentId: number): Promise<number> {
    try {
      return await this.statisticsService.getVectorCount(userId, agentId);
    } catch (error: unknown) {
      logger.error(`❌ Error getting vector count:`, error);
      if (error instanceof HttpException) throw error;
      throw new HttpException(500, `Vector count retrieval failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if vectors are available for a specific agent with caching
   */
  public async areVectorsAvailable(userId: number, agentId: number): Promise<boolean> {
    try {
      return await this.statisticsService.areVectorsAvailable(userId, agentId);
    } catch (error: unknown) {
      logger.error(`❌ Error checking vector availability:`, error);
      return false; // Default to false on error
    }
  }

  /**
   * Legacy method name for backward compatibility
   * @deprecated Use areVectorsAvailable instead. This method will be removed in a future version.
   * @deprecated Since version 1.0.0 - Use areVectorsAvailable() for better naming consistency
   */
  public async agentHasVectors(userId: number, agentId: number): Promise<boolean> {
    console.warn(`⚠️ DEPRECATED: agentHasVectors() is deprecated. Use areVectorsAvailable() instead.`);
    return this.areVectorsAvailable(userId, agentId);
  }

  /**
   * Get vector count for a specific agent (legacy method name)
   * @deprecated Use getVectorCount instead. This method will be removed in a future version.
   * @deprecated Since version 1.0.0 - Use getVectorCount() for better naming consistency
   */
  public async getAgentVectorCount(userId: number, agentId: number): Promise<number> {
    console.warn(`⚠️ DEPRECATED: getAgentVectorCount() is deprecated. Use getVectorCount() instead.`);
    return this.getVectorCount(userId, agentId);
  }

  /**
   * Get comprehensive index statistics
   */
  public async getIndexStats(userId?: number, agentId?: number): Promise<{
    totalVectors: number;
    totalNamespaces: number;
    dimension: number;
    indexFullness: number;
    namespaceStats: { [namespace: string]: { recordCount: number } };
  }> {
    try {
      if (userId && agentId) {
        // Get namespace-specific stats when user and agent are provided
        const namespaceStats = await this.statisticsService.getNamespaceStats(userId, agentId);
        return {
          totalVectors: namespaceStats.recordCount,
          totalNamespaces: 1,
          dimension: namespaceStats.dimension,
          indexFullness: 0, // Not available at namespace level
          namespaceStats: {
            [namespaceStats.namespaceName]: {
              recordCount: namespaceStats.recordCount
            }
          }
        };
      } else {
        // Get global index stats
        return await this.statisticsService.getIndexStats();
      }
    } catch (error: unknown) {
      logger.error(`❌ Error getting index stats:`, error);
      if (error instanceof HttpException) throw error;
      throw new HttpException(500, `Index stats retrieval failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get namespace statistics for a specific user-agent combination
   * @internal Only used internally by getIndexStats()
   */
  private async getNamespaceStats(userId: number, agentId: number): Promise<{
    recordCount: number;
    dimension: number;
    namespaceName: string;
  }> {
    try {
      return await this.statisticsService.getNamespaceStats(userId, agentId);
    } catch (error: unknown) {
      logger.error(`❌ Error getting namespace stats:`, error);
      if (error instanceof HttpException) throw error;
      throw new HttpException(500, `Namespace stats retrieval failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Clear all cached statistics
   */
  public async clearStatisticsCache(userId?: number, agentId?: number): Promise<void> {
    try {
      await this.statisticsService.clearStatisticsCache(userId, agentId);
      logger.info(`✅ Statistics cache cleared successfully`);
    } catch (error: unknown) {
      logger.error(`❌ Error clearing statistics cache:`, error);
      // Don't throw error for cache clearing failure
    }
  }

  /**
   * Clear all search-related caches
   */
  public async clearSearchCache(): Promise<void> {
    try {
      await this.searchService.clearCache();
      logger.info(`✅ Search cache cleared successfully`);
    } catch (error: unknown) {
      logger.error(`❌ Error clearing search cache:`, error);
      // Don't throw error for cache clearing failure
    }
  }

  // ========================
  // UTILITY METHODS
  // ========================

}

export default VectorService;
