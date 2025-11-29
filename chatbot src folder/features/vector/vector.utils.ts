import { vectorConfig } from "../../config/vector.config";

/**
 * Utility functions for vector operations
 */
export class VectorUtils {
  /**
   * Generate namespace name for user-agent combination
   */
  public static generateNamespaceName(userId: number, agentId?: number): string {
    return agentId ? `${vectorConfig.namespace.userPrefix}${userId}${vectorConfig.namespace.separator}${vectorConfig.namespace.agentPrefix}${agentId}` : `${vectorConfig.namespace.userPrefix}${userId}`;
  }
}