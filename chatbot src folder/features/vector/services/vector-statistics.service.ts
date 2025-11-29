import HttpException from "../../../exceptions/HttpException";
import { logger } from "../../../utils/logger";
import { SmartCacheService } from "../../../utils/smart-cache.service";
import { chatbotIndex } from "../../../utils/pinecone";
import type { RecordMetadata } from "@pinecone-database/pinecone";
import { vectorConfig } from "../../../config/vector.config";
import { VectorUtils } from "../vector.utils";
import { cacheConfig } from "../../../config/feature-cache.config";

// Define the structure of Pinecone search hits
interface PineconeHit {
  id: string;
  score: number;
  fields?: RecordMetadata;
}

/**
 * Service responsible for vector index statistics and metrics
 */
class VectorStatisticsService {
  private cacheService = new SmartCacheService("vector_availability");

  /**
   * Get vector count for a specific agent
   */
  public async getVectorCount(userId: number, agentId: number): Promise<number> {
    try {
      const cacheKey = `vector-count-${userId}-${agentId}`;
      const cached = await this.cacheService.get<string>(cacheKey);
      if (cached) {
        return parseInt(cached);
      }

      const namespaceName = VectorUtils.generateNamespaceName(userId, agentId);
      logger.info(`🔀 Using namespace: ${namespaceName}`);
      const namespace = chatbotIndex.namespace(namespaceName);
      const stats = await namespace.describeIndexStats();
      
      const count = stats.totalRecordCount || 0;
      
      // Cache for configured TTL
      await this.cacheService.set(cacheKey, count.toString(), cacheConfig.vector.statistics.vectorCountTTL);
      
      return count;
    } catch (error: unknown) {
      logger.error(`❌ Error getting vector count for agent ${agentId}:`, error);
      throw new HttpException(500, `Error getting vector count: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if vectors are available for a specific agent with caching
   */
  public async areVectorsAvailable(userId: number, agentId: number): Promise<boolean> {
    try {
      const cacheKey = `vectors-available-${userId}-${agentId}`;
      const cached = await this.cacheService.get<string>(cacheKey);
      if (cached !== null) {
        return cached === "true";
      }

      const count = await this.getVectorCount(userId, agentId);
      const available = count > 0;

      // Cache for configured TTL
      await this.cacheService.set(cacheKey, available.toString(), cacheConfig.vector.statistics.vectorAvailabilityTTL);

      return available;
    } catch (error: unknown) {
      logger.error(`❌ Error checking vector availability for agent ${agentId}:`, error);
      return false; // Default to false on error
    }
  }

  /**
   * Get comprehensive index statistics
   */
  public async getIndexStats(): Promise<{
    totalVectors: number;
    totalNamespaces: number;
    dimension: number;
    indexFullness: number;
    namespaceStats: { [namespace: string]: { recordCount: number } };
  }> {
    try {
      const cacheKey = "index-stats";
      const cached = await this.cacheService.get<string>(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      const stats = await chatbotIndex.describeIndexStats();
      
      const indexStats = {
        totalVectors: stats.totalRecordCount || 0,
        totalNamespaces: Object.keys(stats.namespaces || {}).length,
        dimension: stats.dimension || 0,
        indexFullness: stats.indexFullness || 0,
        namespaceStats: stats.namespaces || {},
      };

      // Cache for configured TTL
      await this.cacheService.set(cacheKey, JSON.stringify(indexStats), cacheConfig.vector.statistics.indexStatsTTL);
      
      return indexStats;
    } catch (error: unknown) {
      logger.error(`❌ Error getting index stats:`, error);
      throw new HttpException(500, `Error getting index stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get namespace statistics for a specific user-agent combination
   */
  public async getNamespaceStats(userId: number, agentId: number): Promise<{
    recordCount: number;
    dimension: number;
    namespaceName: string;
  }> {
    try {
      const namespaceName = VectorUtils.generateNamespaceName(userId, agentId);
      const cacheKey = `namespace-stats-${namespaceName}`;
      const cached = await this.cacheService.get<string>(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      logger.info(`🔀 Using namespace: ${namespaceName}`);
      const namespace = chatbotIndex.namespace(namespaceName);
      const stats = await namespace.describeIndexStats();
      
      const namespaceStats = {
        recordCount: stats.totalRecordCount || 0,
        dimension: stats.dimension || 0,
        namespaceName,
      };

      // Cache for configured TTL
      await this.cacheService.set(cacheKey, JSON.stringify(namespaceStats), cacheConfig.vector.statistics.indexStatsTTL);
      
      return namespaceStats;
    } catch (error: unknown) {
      logger.error(`❌ Error getting namespace stats for agent ${agentId}:`, error);
      throw new HttpException(500, `Error getting namespace stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Clear all cached statistics
   */
  public async clearStatisticsCache(userId?: number, agentId?: number): Promise<void> {
    try {
      if (userId && agentId) {
        // Clear specific agent cache
        const namespaceName = VectorUtils.generateNamespaceName(userId, agentId);
        await this.cacheService.delete(`vector-count-${userId}-${agentId}`);
        await this.cacheService.delete(`vectors-available-${userId}-${agentId}`);
        await this.cacheService.delete(`namespace-stats-${namespaceName}`);
      } else if (userId) {
        // Clear user cache
        await this.cacheService.delete(`user-vector-counts-${userId}`);
      } else {
        // Clear global cache
        await this.cacheService.delete("index-stats");
      }

      logger.info(`✅ Statistics cache cleared${userId ? ` for user ${userId}` : ''}${agentId ? ` agent ${agentId}` : ''}`);
    } catch (error: unknown) {
      logger.error(`❌ Error clearing statistics cache:`, error);
      // Don't throw error for cache clearing failure
    }
  }

}

export default VectorStatisticsService;
