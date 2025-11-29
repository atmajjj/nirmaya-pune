import DB from "../../../../database/index.schema";
import { logger } from "../../../utils/logger";
import { EVENT_TYPES } from "../analytics.interface";
import AnalyticsEventService from "./analytics-event.service";

/**
 * Model Usage Analytics Service
 * Track AI model usage, costs, and performance optimization
 */

export interface ModelCostReport {
  timeframe?: string;
  totalCost: number;
  totalTokens: number;
  modelBreakdown: ModelCostBreakdown[];
  costTrends: CostTrendData[];
  optimization: OptimizationRecommendations;
}

export interface ModelPerformanceReport {
  timeframe: string;
  modelMetrics: ModelMetric[];
  performanceComparison: ModelComparison[];
  recommendations: ModelRecommendations;
}

export interface ModelCostBreakdown {
  model: string;
  provider: string;
  totalCost: number;
  totalTokens: number;
  avgCostPerToken: number;
  usageCount: number;
  percentage: number;
}

export interface CostTrendData {
  date: string;
  totalCost: number;
  tokenCount: number;
  avgCostPerToken: number;
}

export interface ModelMetric {
  model: string;
  provider: string;
  avgResponseTime: number;
  totalUsage: number;
  avgCost: number;
  errorRate: number;
  satisfactionScore: number;
}

export interface ModelComparison {
  model: string;
  provider: string;
  performanceScore: number;
  costEfficiency: number;
  recommendationRank: number;
}

export interface ModelRecommendations {
  optimalModel: string;
  costSavings: number;
  performanceImpact: number;
  recommendedActions: string[];
}

export interface OptimizationRecommendations {
  potentialSavings: number;
  recommendedModels: string[];
  actions: string[];
}

class ModelUsageAnalyticsService {
  private analyticsEventService = new AnalyticsEventService();

  /**
   * Track model usage for analytics
   */
  public async trackModelUsage(
    modelId: string,
    provider: string,
    tokens: number,
    cost: number,
    responseTime: number,
    agentId?: number
  ): Promise<void> {
    try {
      await this.analyticsEventService.trackUserActivity({
        userId: agentId || 0, // System user if no specific agent
        eventType: EVENT_TYPES.API_REQUEST,
        eventData: {
          modelId,
          provider,
          tokens,
          cost,
          responseTime,
          agentId,
          timestamp: new Date(),
        },
      });

      logger.info("🤖 Model usage tracked", {
        modelId,
        provider,
        tokens,
        cost,
        responseTime,
      });
    } catch (error) {
      logger.error("❌ Failed to track model usage", {
        error: error.message,
        modelId,
        provider,
      });
    }
  }

  /**
   * Calculate model costs for a given timeframe
   */
  public async calculateModelCosts(timeframe?: string): Promise<ModelCostReport> {
    try {
      const { startDate, endDate } = timeframe ? this.parseTimeframe(timeframe) : { startDate: null, endDate: null };

      // Get cost breakdown by model
      const modelBreakdown = await this.getModelCostBreakdown(startDate, endDate);
      
      // Get cost trends over time
      const costTrends = await this.getCostTrends(startDate, endDate);
      
      // Calculate totals
      const totalCost = modelBreakdown.reduce((sum, model) => sum + model.totalCost, 0);
      const totalTokens = modelBreakdown.reduce((sum, model) => sum + model.totalTokens, 0);
      
      // Generate optimization recommendations
      const optimization = await this.generateCostOptimizations(modelBreakdown);

      const report: ModelCostReport = {
        totalCost,
        totalTokens,
        modelBreakdown,
        costTrends,
        optimization,
      };

      logger.info("💰 Model cost report generated", {
        totalCost,
        totalTokens,
        modelCount: modelBreakdown.length,
      });

      return report;
    } catch (error) {
      logger.error("❌ Failed to calculate model costs", {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Analyze model performance across different metrics
   */
  public async analyzeModelPerformance(timeframe: string = '7d'): Promise<ModelPerformanceReport> {
    try {
      const { startDate, endDate } = this.parseTimeframe(timeframe);

      // Get performance metrics for each model
      const modelMetrics = await this.getModelPerformanceMetrics(startDate, endDate);
      
      // Generate performance comparisons
      const performanceComparison = await this.compareModelPerformance(modelMetrics);
      
      // Generate recommendations
      const recommendations = this.generateModelRecommendations(performanceComparison);

      const report: ModelPerformanceReport = {
        timeframe,
        modelMetrics,
        performanceComparison,
        recommendations,
      };

      logger.info("📊 Model performance analyzed", {
        timeframe,
        modelCount: modelMetrics.length,
        optimalModel: recommendations.optimalModel,
      });

      return report;
    } catch (error) {
      logger.error("❌ Failed to analyze model performance", {
        error: error.message,
        timeframe,
      });
      throw error;
    }
  }

  /**
   * Get optimization recommendations for agent model selection
   */
  public async optimizeModelSelection(agentId: number): Promise<ModelRecommendations> {
    try {
      // Get agent's current model usage patterns
      const agentUsage = await DB("chat_analytics")
        .select("*")
        .where("agent_id", agentId)
        .where("created_at", ">=", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)) // Last 30 days
        .orderBy("created_at", "desc");

      if (agentUsage.length === 0) {
        return {
          optimalModel: "groq-llama3-8b", // Default recommendation
          costSavings: 0,
          performanceImpact: 0,
          recommendedActions: ["Insufficient data for recommendations. Continue using current model."],
        };
      }

      // Analyze current performance
      const currentPerformance = this.analyzeAgentUsagePatterns(agentUsage);
      
      // Get model performance data for comparison
      const modelPerformance = await this.analyzeModelPerformance('30d');
      
      // Generate optimization recommendations
      const recommendations = this.generateAgentOptimizations(
        currentPerformance,
        modelPerformance
      );

      logger.info("🎯 Model optimization recommendations generated", {
        agentId,
        optimalModel: recommendations.optimalModel,
        potentialSavings: recommendations.costSavings,
      });

      return recommendations;
    } catch (error) {
      logger.error("❌ Failed to optimize model selection", {
        error: error.message,
        agentId,
      });
      throw error;
    }
  }

  /**
   * Get model usage statistics summary
   */
  public async getModelUsageSummary(timeframe?: string): Promise<any> {
    try {
      const { startDate, endDate } = timeframe ? this.parseTimeframe(timeframe) : { startDate: null, endDate: null };

      // Get usage statistics from chat analytics
      let query = DB("chat_analytics")
        .join("agents", "chat_analytics.agent_id", "agents.id")
        .select(
          "agents.model",
          "agents.provider",
          DB.raw("COUNT(*) as usage_count"),
          DB.raw("SUM(chat_analytics.cost_estimate) as total_cost"),
          DB.raw("AVG(chat_analytics.response_time_ms) as avg_response_time"),
          DB.raw("AVG(chat_analytics.user_satisfaction_score) as avg_satisfaction")
        );

      if (startDate && endDate) {
        query = query.where("chat_analytics.created_at", ">=", startDate)
                    .where("chat_analytics.created_at", "<=", endDate);
      }

      const usageStats = await query.groupBy("agents.model", "agents.provider")
                                   .orderBy("usage_count", "desc");

      const summary = {
        totalModels: usageStats.length,
        mostUsedModel: usageStats[0]?.model || "None",
        totalUsage: usageStats.reduce((sum: number, stat: any) => sum + parseInt(stat.usage_count), 0),
        totalCost: usageStats.reduce((sum: number, stat: any) => sum + parseFloat(stat.total_cost || 0), 0),
        modelStats: usageStats.map((stat: any) => ({
          model: stat.model,
          provider: stat.provider,
          usageCount: parseInt(stat.usage_count),
          totalCost: parseFloat(stat.total_cost || 0),
          avgResponseTime: parseFloat(stat.avg_response_time || 0),
          avgSatisfaction: parseFloat(stat.avg_satisfaction || 0),
        })),
      };

      logger.info("📈 Model usage summary generated", {
        totalModels: summary.totalModels,
        totalUsage: summary.totalUsage,
      });

      return summary;
    } catch (error) {
      logger.error("❌ Failed to get model usage summary", {
        error: error.message,
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

  private async getModelCostBreakdown(
    startDate?: Date,
    endDate?: Date
  ): Promise<ModelCostBreakdown[]> {
    let query = DB("chat_analytics")
      .join("agents", "chat_analytics.agent_id", "agents.id")
      .select(
        "agents.model",
        "agents.provider",
        DB.raw("SUM(chat_analytics.cost_estimate) as total_cost"),
        DB.raw("COUNT(*) as usage_count")
      );

    if (startDate && endDate) {
      query = query.where("chat_analytics.created_at", ">=", startDate)
                  .where("chat_analytics.created_at", "<=", endDate);
    }

    const costData = await query
      .groupBy("agents.model", "agents.provider")
      .orderBy("total_cost", "desc");

    const totalCost = costData.reduce((sum: number, row: any) => sum + parseFloat(row.total_cost || 0), 0);

    return costData.map((row: any) => {
      const modelTotalCost = parseFloat(row.total_cost || 0);
      const estimatedTokens = Math.round(modelTotalCost * 1000); // Rough estimation

      return {
        model: row.model,
        provider: row.provider,
        totalCost: modelTotalCost,
        totalTokens: estimatedTokens,
        avgCostPerToken: estimatedTokens > 0 ? modelTotalCost / estimatedTokens : 0,
        usageCount: parseInt(row.usage_count),
        percentage: totalCost > 0 ? (modelTotalCost / totalCost) * 100 : 0,
      };
    });
  }

  private async getCostTrends(startDate?: Date, endDate?: Date): Promise<CostTrendData[]> {
    let query = DB("chat_analytics")
      .select(DB.raw("DATE(created_at) as date"))
      .sum("cost_estimate as daily_cost")
      .count("* as daily_usage");

    if (startDate && endDate) {
      query = query.where("created_at", ">=", startDate)
                  .where("created_at", "<=", endDate);
    }

    const trendData = await query
      .groupBy(DB.raw("DATE(created_at)"))
      .orderBy("date");

    return trendData.map((row: any) => ({
      date: row.date,
      totalCost: parseFloat(row.daily_cost || 0),
      tokenCount: parseInt(row.daily_usage) * 100, // Rough estimation
      avgCostPerToken: parseFloat(row.daily_cost || 0) / (parseInt(row.daily_usage) * 100 || 1),
    }));
  }

  private async getModelPerformanceMetrics(
    startDate?: Date,
    endDate?: Date
  ): Promise<ModelMetric[]> {
    let query = DB("chat_analytics")
      .join("agents", "chat_analytics.agent_id", "agents.id")
      .select(
        "agents.model",
        "agents.provider",
        DB.raw("AVG(chat_analytics.response_time_ms) as avg_response_time"),
        DB.raw("COUNT(*) as total_usage"),
        DB.raw("AVG(chat_analytics.cost_estimate) as avg_cost"),
        DB.raw("AVG(chat_analytics.user_satisfaction_score) as satisfaction_score")
      );

    if (startDate && endDate) {
      query = query.where("chat_analytics.created_at", ">=", startDate)
                  .where("chat_analytics.created_at", "<=", endDate);
    }

    const performanceData = await query
      .groupBy("agents.model", "agents.provider")
      .orderBy("total_usage", "desc");

    return performanceData.map((row: any) => ({
      model: row.model,
      provider: row.provider,
      avgResponseTime: parseFloat(row.avg_response_time || 0),
      totalUsage: parseInt(row.total_usage),
      avgCost: parseFloat(row.avg_cost || 0),
      errorRate: 0, // Would need additional error tracking
      satisfactionScore: parseFloat(row.satisfaction_score || 0),
    }));
  }

  private async compareModelPerformance(modelMetrics: ModelMetric[]): Promise<ModelComparison[]> {
    return modelMetrics.map((metric, index) => {
      // Calculate performance score (0-100)
      const responseScore = Math.max(0, 100 - (metric.avgResponseTime / 50)); // Penalize slow responses
      const satisfactionScore = (metric.satisfactionScore / 5) * 100; // Convert to 0-100
      const usageScore = Math.min((metric.totalUsage / 10) * 10, 50); // Usage popularity

      const performanceScore = (responseScore * 0.4 + satisfactionScore * 0.4 + usageScore * 0.2);
      
      // Calculate cost efficiency (higher is better)
      const costEfficiency = metric.avgCost > 0 ? satisfactionScore / metric.avgCost : 0;

      return {
        model: metric.model,
        provider: metric.provider,
        performanceScore: Math.round(performanceScore),
        costEfficiency: Math.round(costEfficiency * 1000), // Scale up for readability
        recommendationRank: index + 1,
      };
    }).sort((a, b) => b.performanceScore - a.performanceScore);
  }

  private generateModelRecommendations(comparisons: ModelComparison[]): ModelRecommendations {
    const bestModel = comparisons[0];
    const worstModel = comparisons[comparisons.length - 1];

    return {
      optimalModel: bestModel?.model || "groq-llama3-8b",
      costSavings: 0, // Would calculate based on current vs optimal usage
      performanceImpact: bestModel ? bestModel.performanceScore - (worstModel?.performanceScore || 0) : 0,
      recommendedActions: [
        `Consider using ${bestModel?.model} for optimal performance`,
        "Monitor response times and user satisfaction regularly",
        "Evaluate cost vs performance trade-offs monthly",
      ],
    };
  }

  private generateCostOptimizations(breakdown: ModelCostBreakdown[]): OptimizationRecommendations {
    const totalCost = breakdown.reduce((sum, model) => sum + model.totalCost, 0);
    const potentialSavings = totalCost * 0.15; // Assume 15% potential savings

    return {
      potentialSavings,
      recommendedModels: breakdown
        .filter(model => model.avgCostPerToken < 0.002)
        .map(model => model.model)
        .slice(0, 3),
      actions: [
        "Consider migrating high-volume agents to cost-effective models",
        "Implement usage-based model selection",
        "Regular cost monitoring and optimization reviews",
      ],
    };
  }

  private analyzeAgentUsagePatterns(usageData: any[]): any {
    const totalSessions = usageData.length;
    const avgResponseTime = usageData.reduce((sum, session) => sum + (session.response_time_ms || 0), 0) / totalSessions;
    const avgCost = usageData.reduce((sum, session) => sum + (session.cost_estimate || 0), 0) / totalSessions;
    const avgSatisfaction = usageData.reduce((sum, session) => sum + (session.user_satisfaction_score || 0), 0) / totalSessions;

    return {
      totalSessions,
      avgResponseTime,
      avgCost,
      avgSatisfaction,
    };
  }

  private generateAgentOptimizations(
    currentPerformance: any,
    modelPerformance: ModelPerformanceReport
  ): ModelRecommendations {
    const bestModel = modelPerformance.performanceComparison[0];
    
    // Simple optimization logic
    const potentialSavings = Math.max(0, currentPerformance.avgCost - (bestModel?.costEfficiency || 0));
    
    return {
      optimalModel: bestModel?.model || "groq-llama3-8b",
      costSavings: potentialSavings,
      performanceImpact: 5, // Placeholder
      recommendedActions: [
        "Test the recommended model with a subset of queries",
        "Monitor performance metrics after model change",
        "Gradually migrate if results are positive",
      ],
    };
  }
}

export default ModelUsageAnalyticsService;