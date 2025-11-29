import DB from "../../../../database/index.schema";
import { logger } from "../../../utils/logger";
import { EVENT_TYPES } from "../analytics.interface";
import AnalyticsEventService from "./analytics-event.service";

/**
 * Agent Performance Analytics Service
 * Comprehensive agent performance tracking and analysis
 */

export interface AgentPerformanceReport {
  agentId: number;
  agentName: string;
  totalChats: number;
  totalMessages: number;
  avgResponseTime: number;
  costAnalysis: CostBreakdown;
  qualityMetrics: QualityMetrics; // Simplified - only include meaningful metrics
}

export interface CostBreakdown {
  totalCost: number;
  avgCostPerChat: number;
  avgCostPerMessage: number;
  tokenUsage: number;
  modelDistribution: ModelUsageData[];
}

export interface QualityMetrics {
  avgMessageLength: number;
  responseConsistency: number;
}

export interface ModelUsageData {
  model: string;
  provider: string;
  usageCount: number;
  totalCost: number;
  avgResponseTime: number;
}

export interface SatisfactionTrendData {
  date: string;
  avgScore: number;
  responseCount: number;
}

class AgentPerformanceAnalyticsService {
  private analyticsEventService = new AnalyticsEventService();

  /**
   * Generate comprehensive performance report for an agent
   */
  public async generatePerformanceReport(
    agentId: number
  ): Promise<AgentPerformanceReport> {
    try {
      // Get agent basic info
      const agent = await DB("agents")
        .where("id", agentId)
        .first();

      if (!agent) {
        throw new Error(`Agent with ID ${agentId} not found`);
      }

            // Parallel data fetching for performance
      const [
        chatStats,
        costAnalysis,
        qualityMetrics
      ] = await Promise.all([
        this.getChatStatistics(agentId),
        this.calculateCostAnalysis(agentId),
        this.calculateQualityMetrics(agentId)
      ]);

      // Build report with simplified metrics
      const report: AgentPerformanceReport = {
        agentId,
        agentName: agent.name,
        totalChats: chatStats.totalChats,
        totalMessages: chatStats.totalMessages,
        avgResponseTime: chatStats.avgResponseTime,
        costAnalysis,
        qualityMetrics,
      };

      logger.info("📊 Agent performance report generated", {
        agentId,
        totalChats: report.totalChats,
        avgResponseTime: report.avgResponseTime,
      });

      return report;
    } catch (error) {
      logger.error("❌ Failed to generate agent performance report", {
        error: error.message,
        agentId,
      });
      throw error;
    }
  }

  public async trackAgentCosts(
    agentId: number,
    model: string,
    provider: string,
    tokens: number,
    cost: number
  ): Promise<void> {
    try {
      await this.analyticsEventService.trackUserActivity({
        userId: agentId, // Using agentId as identifier
        eventType: EVENT_TYPES.AGENT_TRAIN_COMPLETE,
        eventData: {
          agentId,
          model,
          provider,
          tokens,
          cost,
          timestamp: new Date(),
        },
      });

      logger.info("💰 Agent costs tracked", {
        agentId,
        model,
        tokens,
        cost,
      });
    } catch (error) {
      logger.error("❌ Failed to track agent costs", {
        error: error.message,
        agentId,
        model,
      });
    }
  }

  /**
   * Compare performance across multiple agents
   */
  public async compareAgentPerformance(
    agentIds: number[]
  ): Promise<AgentPerformanceReport[]> {
    try {
      const reports = await Promise.all(
        agentIds.map(agentId => this.generatePerformanceReport(agentId))
      );

      logger.info("📊 Agent performance comparison generated", {
        agentCount: agentIds.length,
      });

      return reports.sort((a, b) => b.totalChats - a.totalChats); // Sort by activity
    } catch (error) {
      logger.error("❌ Failed to compare agent performance", {
        error: error.message,
        agentIds,
      });
      throw error;
    }
  }

  /**
   * Get top performing agents by various metrics
   */
  public async getTopPerformingAgents(
    metric: 'chats' | 'satisfaction' | 'efficiency' | 'cost',
    timeframe?: string,
    limit: number = 10
  ): Promise<any[]> {
    try {
      let query = DB("chat_analytics")
        .select("agent_id")
        .count("* as total_chats")
        .sum("cost_estimate as total_cost")
        .avg("response_time_ms as avg_response_time")
        .avg("user_satisfaction_score as avg_satisfaction")
        .groupBy("agent_id");

      // Apply timeframe filtering if provided
      if (timeframe) {
        const { startDate, endDate } = this.parseTimeframe(timeframe);
        query = query.where("created_at", ">=", startDate).where("created_at", "<=", endDate);
      }

      // Add sorting based on metric
      switch (metric) {
        case 'chats':
          query = query.orderBy("total_chats", "desc");
          break;
        case 'satisfaction':
          query = query.orderBy("avg_satisfaction", "desc");
          break;
        case 'efficiency':
          query = query.orderBy("avg_response_time", "asc");
          break;
        case 'cost':
          query = query.orderBy("total_cost", "asc");
          break;
      }

      const results = await query.limit(limit);

      // Enrich with agent names
      const enrichedResults = await Promise.all(
        results.map(async (result: any) => {
          const agent = await DB("agents")
            .select("name", "model", "provider")
            .where("id", result.agent_id)
            .first();

          return {
            agentId: result.agent_id,
            agentName: agent?.name || "Unknown",
            model: agent?.model,
            provider: agent?.provider,
            totalChats: parseInt(result.total_chats),
            totalCost: parseFloat(result.total_cost) || 0,
            avgResponseTime: parseFloat(result.avg_response_time) || 0,
            avgSatisfaction: parseFloat(result.avg_satisfaction) || 0,
          };
        })
      );

      logger.info("🏆 Top performing agents retrieved", {
        metric,
        timeframe,
        count: enrichedResults.length,
      });

      return enrichedResults;
    } catch (error) {
      logger.error("❌ Failed to get top performing agents", {
        error: error.message,
        metric,
        timeframe,
      });
      throw error;
    }
  }

  /**
   * Private helper methods
   */
  private parseTimeframe(timeframe: string): { startDate: Date; endDate: Date } {
    const endDate = new Date();
    const startDate = new Date();

    const timeframeMap: Record<string, number> = {
      '1d': 1,
      '7d': 7,
      '30d': 30,
      '90d': 90,
    };

    const days = timeframeMap[timeframe] || 7;
    startDate.setDate(startDate.getDate() - days);

    return { startDate, endDate };
  }

  private async getChatStatistics(
    agentId: number,
    startDate?: Date,
    endDate?: Date
  ): Promise<{ totalChats: number; totalMessages: number; avgResponseTime: number }> {
    console.log(`🔍 Querying chat stats for agent ${agentId}${startDate && endDate ? ` from ${startDate} to ${endDate}` : ' (all time)'}`);

    let query = DB("chat_analytics")
      .where("agent_id", agentId)
      .count("* as total_chats")
      .sum("message_count as total_messages")
      .avg("response_time_ms as avg_response_time");

    if (startDate && endDate) {
      query = query.where("created_at", ">=", startDate).where("created_at", "<=", endDate);
    }

    const stats = await query.first();

    console.log(`📊 Raw stats result:`, stats);

    const result = {
      totalChats: parseInt(stats.total_chats) || 0,
      totalMessages: parseInt(stats.total_messages) || 0,
      avgResponseTime: parseFloat(stats.avg_response_time) || 0,
    };

    console.log(`📈 Processed stats:`, result);

    return result;
  }

  private async calculateCostAnalysis(
    agentId: number,
    startDate?: Date,
    endDate?: Date
  ): Promise<CostBreakdown> {
    let query = DB("chat_analytics")
      .where("agent_id", agentId)
      .sum("cost_estimate as total_cost")
      .count("* as total_sessions")
      .sum("message_count as total_messages");

    if (startDate && endDate) {
      query = query.where("created_at", ">=", startDate).where("created_at", "<=", endDate);
    }

    const costData = await query.first();

    const totalCost = parseFloat(costData.total_cost) || 0;
    const totalSessions = parseInt(costData.total_sessions) || 1;
    const totalMessages = parseInt(costData.total_messages) || 1;

    // Get model distribution (simplified)
    const agent = await DB("agents").where("id", agentId).first();
    const modelDistribution: ModelUsageData[] = [{
      model: agent?.model || "unknown",
      provider: agent?.provider || "unknown",
      usageCount: totalSessions,
      totalCost,
      avgResponseTime: 0, // Would need additional tracking for this
    }];

    // Calculate estimated tokens based on cost and provider rates
    // Rough estimation: cost per 1K tokens for different providers
    const providerRates: Record<string, number> = {
      'openai': 0.002,      // GPT-3.5 Turbo average
      'anthropic': 0.008,   // Claude-3 Haiku
      'groq': 0.001,        // Groq models
      'google': 0.001,      // Gemini
    };

    const provider = agent?.provider?.toLowerCase() || 'openai';
    const costPer1K = providerRates[provider] || 0.002;
    const estimatedTokens = Math.round((totalCost / costPer1K) * 1000);

    return {
      totalCost,
      avgCostPerChat: totalCost / totalSessions,
      avgCostPerMessage: totalCost / totalMessages,
      tokenUsage: estimatedTokens,
      modelDistribution,
    };
  }

  private async calculateQualityMetrics(
    agentId: number,
    startDate?: Date,
    endDate?: Date
  ): Promise<QualityMetrics> {
    // Get average message length from actual messages (not context)
    let sql = `
      SELECT AVG(LENGTH(content)) as avg_message_length
      FROM messages
      INNER JOIN chat_sessions ON messages.session_id = chat_sessions.id
      WHERE chat_sessions.agent_id = ?
      AND messages.role = 'assistant'
    `;
    const params: any[] = [agentId];

    if (startDate && endDate) {
      sql += ` AND messages.created_at >= ? AND messages.created_at <= ?`;
      params.push(startDate, endDate);
    }

    const messageLengthData = await DB.raw(sql, params);

    const avgMessageLength = parseFloat(messageLengthData.rows[0]?.avg_message_length) || 0;

    return {
      avgMessageLength,
      responseConsistency: 85, // Placeholder - would need advanced analysis
    };
  }
}

export default AgentPerformanceAnalyticsService;