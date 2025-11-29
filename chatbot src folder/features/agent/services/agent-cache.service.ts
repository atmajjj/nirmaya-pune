import { SmartCacheService } from "../../../utils/smart-cache.service";
import { IAgent } from "../agent.interface";
import { logger } from "../../../utils/logger";

/**
 * Agent Cache Service
 * Caches agent data including configuration, model settings, and encrypted API keys
 */
class AgentCacheService {
  private cache: SmartCacheService;

  constructor() {
    this.cache = new SmartCacheService("agent");
  }

  /**
   * Generate cache key for agent
   */
  private getAgentKey(agentId: number, userId: number): string {
    return `${userId}_${agentId}`;
  }

    /**
   * Get or fetch agent with caching (primary method)
   */
  public async getOrFetch(
    agentId: number,
    userId: number,
    fetchCallback: () => Promise<IAgent>
  ): Promise<IAgent> {
    const key = this.getAgentKey(agentId, userId);
    return await this.cache.getOrSet(key, fetchCallback);
  }

  /**
   * Invalidate agent cache (e.g., after agent update)
   */
  public async invalidateAgent(agentId: number, userId: number): Promise<void> {
    const key = this.getAgentKey(agentId, userId);
    await this.cache.delete(key);
    logger.info(`🗑️  Agent cache invalidated: ID ${agentId}, User ${userId}`);
  }
}

// Export singleton instance
export default new AgentCacheService();
