import { SmartCacheService } from "../../../utils/smart-cache.service";
import { IVectorSearchResult } from "../vector.interface";
import { logger } from "../../../utils/logger";
import { vectorConfig } from "../../../config/vector.config";
import { cacheConfig } from "../../../config/feature-cache.config";

/**
 * Unified Cache Service for Vector Operations and AI Responses
 * Consolidates caching logic from response-cache.service.ts and vector-cache.service.ts
 * Provides centralized caching for vector search results, AI responses, and reranked results
 */
class UnifiedCacheService {
  private responseCache: SmartCacheService;
  private vectorCache: SmartCacheService;
  private rerankCache: SmartCacheService;
  private agentKeys: Map<string, Set<string>> = new Map(); // agentKey -> Set<cacheKey>

  constructor() {
    this.responseCache = new SmartCacheService("context");
    this.vectorCache = new SmartCacheService("context");
    this.rerankCache = new SmartCacheService("context");
  }

  // ========================
  // AI RESPONSE CACHING
  // ========================

  /**
   * Generate cache key for AI response based on query content and context
   */
  private generateResponseCacheKey(
    query: string,
    agentId: number,
    userId: number,
    contextHash?: string
  ): string {
    // Normalize query (lowercase, trim, remove extra spaces)
    const normalizedQuery = query.toLowerCase().trim().replace(/\s+/g, ' ');

    // Create cache key components
    const components = [
      normalizedQuery,
      agentId.toString(),
      contextHash || 'no-context'
    ];

    return SmartCacheService.hashKey(...components);
  }

  /**
   * Generate hash for context to detect if context has changed
   */
  private generateContextHash(context: string): string {
    if (!context || context.length === 0) {
      return 'no-context';
    }

    // Create simple hash of context content
    return SmartCacheService.hashKey(context);
  }

  /**
   * Check if query should be cached - simplified rules for obvious caching wins
   */
  private shouldCacheResponse(query: string): boolean {
    const normalizedQuery = query.toLowerCase();

    // Don't cache obviously personalized queries
    const personalizationIndicators = ['my ', 'i ', 'me ', 'mine', 'myself', 'personal'];

    const hasPersonalization = personalizationIndicators.some(term =>
      normalizedQuery.includes(term)
    );

    // Cache queries that are:
    // 1. Not personalized
    // 2. At least 20 characters (substantial queries)
    // 3. Not questions (questions are often unique)
    return !hasPersonalization &&
           query.length >= 20 &&
           !normalizedQuery.includes('?');
  }

  /**
   * Get cached AI response for a query
   */
  public async getCachedResponse(
    query: string,
    agentId: number,
    userId: number,
    context?: string
  ): Promise<string | null> {
    try {
      if (!this.shouldCacheResponse(query)) {
        return null;
      }

      const contextHash = context ? this.generateContextHash(context) : undefined;
      const cacheKey = this.generateResponseCacheKey(query, agentId, userId, contextHash);

      const cached = await this.responseCache.get<{
        response: string;
        timestamp: number;
        agentId: number;
        queryLength: number;
      }>(cacheKey);

      if (cached) {
        logger.info(`⚡ AI Response cache HIT for agent ${agentId}: ${query.substring(0, 50)}...`);
        return cached.response;
      }

      return null;
    } catch (error: any) {
      logger.error('Error getting cached response:', error);
      return null;
    }
  }

  /**
   * Cache an AI response for future use
   */
  public async setCachedResponse(
    query: string,
    response: string,
    agentId: number,
    userId: number,
    context?: string
  ): Promise<void> {
    try {
      // Only cache if query meets criteria and response is substantial
      if (!this.shouldCacheResponse(query) || !response || response.length < 20) {
        return;
      }

      const contextHash = context ? this.generateContextHash(context) : undefined;
      const cacheKey = this.generateResponseCacheKey(query, agentId, userId, contextHash);

      const cacheData = {
        response,
        timestamp: Date.now(),
        agentId,
        queryLength: query.length
      };

      // Cache responses for configured TTL
      await this.responseCache.set(cacheKey, cacheData, cacheConfig.chat.responseCache.ttl * 1000);

      logger.info(`💾 AI Response cached for agent ${agentId}: ${query.substring(0, 50)}...`);
    } catch (error: any) {
      logger.error('Error caching response:', error);
      // Don't throw - caching is optional
    }
  }

  // ========================
  // VECTOR SEARCH CACHING
  // ========================

  /**
   * Get cached vector search results
   */
  public async getVectorSearchResults(
    query: string,
    userId: number,
    agentId: number
  ): Promise<IVectorSearchResult[] | null> {
    const key = SmartCacheService.hashKey("search", query, userId, agentId);
    return await this.vectorCache.get<IVectorSearchResult[]>(key);
  }

  /**
   * Cache vector search results
   */
  public async setVectorSearchResults(
    query: string,
    userId: number,
    agentId: number,
    results: IVectorSearchResult[]
  ): Promise<void> {
    const key = SmartCacheService.hashKey("search", query, userId, agentId);
    await this.vectorCache.set(key, results);

    // Track key for invalidation
    const agentKey = `${userId}_${agentId}`;
    if (!this.agentKeys.has(agentKey)) {
      this.agentKeys.set(agentKey, new Set());
    }
    this.agentKeys.get(agentKey)!.add(key);

    logger.debug(
      `💾 Vector search cached: ${results.length} results for "${query.substring(0, 50)}..."`
    );
  }

  /**
   * Get cached reranked results
   */
  public async getRerankedResults(
    query: string,
    userId: number,
    agentId: number
  ): Promise<IVectorSearchResult[] | null> {
    const key = SmartCacheService.hashKey("reranked", query, userId, agentId);
    return await this.rerankCache.get<IVectorSearchResult[]>(key);
  }

  /**
   * Cache reranked results
   */
  public async setRerankedResults(
    query: string,
    userId: number,
    agentId: number,
    results: IVectorSearchResult[]
  ): Promise<void> {
    const key = SmartCacheService.hashKey("reranked", query, userId, agentId);
    await this.rerankCache.set(key, results);

    // Track key for invalidation
    const agentKey = `${userId}_${agentId}`;
    if (!this.agentKeys.has(agentKey)) {
      this.agentKeys.set(agentKey, new Set());
    }
    this.agentKeys.get(agentKey)!.add(key);

    logger.debug(
      `💾 Reranked results cached: ${results.length} results for "${query.substring(0, 50)}..."`
    );
  }

  // ========================
  // CACHE MANAGEMENT
  // ========================

  /**
   * Invalidate all cache for an agent (e.g., after training)
   */
  public async invalidateAgentCache(userId: number, agentId: number): Promise<void> {
    const agentKey = `${userId}_${agentId}`;
    const keys = this.agentKeys.get(agentKey);

    if (keys && keys.size > 0) {
      // Delete all tracked keys for this agent
      const keyArray = Array.from(keys);
      for (const key of keyArray) {
        await this.vectorCache.delete(key);
        await this.rerankCache.delete(key);
      }

      // Clear the tracking
      this.agentKeys.delete(agentKey);
    }

    logger.info(`🗑️ Vector cache invalidated for Agent ${agentId}, User ${userId}`);
  }

  /**
   * Invalidate all cache for a user
   */
  public async invalidateUserCache(userId: number): Promise<void> {
    // Find all agent keys for this user
    const userAgentKeys = Array.from(this.agentKeys.keys()).filter(key =>
      key.startsWith(`${userId}_`)
    );

    // Invalidate each agent
    for (const agentKey of userAgentKeys) {
      const [, agentId] = agentKey.split('_');
      await this.invalidateAgentCache(userId, parseInt(agentId));
    }

    logger.info(`🗑️ Vector cache invalidated for User ${userId}`);
  }

  /**
   * Clear all caches
   */
  public async clearAllCaches(): Promise<void> {
    await this.responseCache.clear();
    await this.vectorCache.clear();
    await this.rerankCache.clear();
    this.agentKeys.clear();
    logger.info(`🗑️ All caches cleared`);
  }

  /**
   * Get cache statistics
   */
  public getCacheStats() {
    return {
      responseCache: {
        l1Size: this.responseCache.getStats().l1Size,
        defaultTTL: this.responseCache.getStats().defaultTTL,
      },
      vectorCache: {
        l1Size: this.vectorCache.getStats().l1Size,
        defaultTTL: this.vectorCache.getStats().defaultTTL,
      },
      rerankCache: {
        l1Size: this.rerankCache.getStats().l1Size,
        defaultTTL: this.rerankCache.getStats().defaultTTL,
      },
      trackedAgents: this.agentKeys.size,
      totalTrackedKeys: Array.from(this.agentKeys.values()).reduce((sum, keys) => sum + keys.size, 0)
    };
  }
}

// Export singleton instance
const unifiedCacheService = new UnifiedCacheService();
export default unifiedCacheService;