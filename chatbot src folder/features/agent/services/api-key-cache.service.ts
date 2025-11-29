import { SmartCacheService } from "../../../utils/smart-cache.service";
import { logger } from "../../../utils/logger";

/**
 * API Key Cache Service
 * Caches decrypted API keys for agents to avoid repeated decryption
 * Security: Keys are cached in memory and Redis with short TTL
 */
class ApiKeyCacheService {
  private cache: SmartCacheService;

  constructor() {
    this.cache = new SmartCacheService("api_key");
  }

  /**
   * Generate cache key for API key
   * Format: userId_agentId
   */
  private getApiKeyKey(agentId: number, userId: number): string {
    return `${userId}_${agentId}`;
  }

  /**
   * Get decrypted API key or execute callback if cache miss
   */
  public async getOrDecrypt(
    agentId: number,
    userId: number,
    decryptCallback: () => Promise<string>
  ): Promise<string> {
    const key = this.getApiKeyKey(agentId, userId);

    // Try cache first
    const cached = await this.cache.get<string>(key);
    if (cached) {
      logger.debug(`🔑 API key cache hit for agent ${agentId}`);
      return cached;
    }

    // Cache miss - decrypt and cache
    logger.debug(`🔓 API key cache miss for agent ${agentId} - decrypting`);
    const decryptedKey = await decryptCallback();
    await this.cache.set(key, decryptedKey);
    logger.debug(`🔐 API key cached for agent ${agentId} (user: ${userId})`);

    return decryptedKey;
  }

  /**
   * Invalidate cached API key (useful when agent API key is updated)
   */
  public async invalidateApiKey(
    agentId: number,
    userId: number
  ): Promise<void> {
    const key = this.getApiKeyKey(agentId, userId);
    await this.cache.delete(key);
    logger.debug(`🗑️ API key cache invalidated for agent ${agentId} (user: ${userId})`);
  }
}

// Export singleton instance
const apiKeyCacheService = new ApiKeyCacheService();
export default apiKeyCacheService;