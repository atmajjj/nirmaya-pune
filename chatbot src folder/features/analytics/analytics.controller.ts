import { NextFunction, Response } from "express";
import { RequestWithUser } from "../../interfaces/auth.interface";
import UserBehaviorService from "./services/user-behavior.service";
import AnalyticsEventService from "./services/analytics-event.service";
import AgentPerformanceAnalyticsService from "./services/agent-performance-analytics.service";
import ModelUsageAnalyticsService from "./services/model-usage-analytics.service";
import HttpException from "../../exceptions/HttpException";
import { logger } from "../../utils/logger";
import { ResponseUtil } from "../../utils/response.util";

/**
 * Analytics Controller
 * Handles analytics API endpoints for user behavior and agent performance analytics
 */
class AnalyticsController {
  private userBehaviorService = new UserBehaviorService();
  private analyticsEventService = new AnalyticsEventService();
  private agentPerformanceService = new AgentPerformanceAnalyticsService();
  private modelUsageService = new ModelUsageAnalyticsService();

  /**
   * Get user engagement analytics
   * GET /api/v1/analytics/user/engagement
   */
  public getUserEngagement = async (
    req: RequestWithUser,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const userId = req.userId!;

      const engagement = await this.userBehaviorService.analyzeUserEngagement(userId);

      logger.info("📊 User engagement retrieved", {
        userId,
        engagementScore: engagement.engagementScore,
      });

      res.status(200).json(
        ResponseUtil.success("User engagement analytics retrieved successfully", engagement)
      );
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get user behavior insights (admin only)
   * GET /api/v1/analytics/behavior/insights
   */
  public getBehaviorInsights = async (
    req: RequestWithUser,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const startDate = req.query.startDate 
        ? new Date(req.query.startDate as string)
        : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // Default: 7 days ago

      const endDate = req.query.endDate 
        ? new Date(req.query.endDate as string)
        : new Date(); // Default: now

      const limit = parseInt(req.query.limit as string) || 100;

      if (startDate >= endDate) {
        throw new HttpException(400, "Start date must be before end date");
      }

      if (limit < 1 || limit > 1000) {
        throw new HttpException(400, "Limit must be between 1 and 1000");
      }

      const insights = await this.userBehaviorService.getUserBehaviorInsights(
        startDate,
        endDate,
        limit
      );

      logger.info("📈 Behavior insights retrieved", {
        userId: req.userId,
        period: insights.period.days,
        totalUsers: insights.summary.totalUsers,
      });

      res.status(200).json(
        ResponseUtil.success("User behavior insights retrieved successfully", insights)
      );
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get user retention metrics (admin only)
   * GET /api/v1/analytics/retention
   */
  public getRetentionMetrics = async (
    req: RequestWithUser,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const cohortDate = req.query.cohortDate 
        ? new Date(req.query.cohortDate as string)
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default: 30 days ago

      const days = parseInt(req.query.days as string) || 30;

      if (days < 1 || days > 365) {
        throw new HttpException(400, "Days must be between 1 and 365");
      }

      if (cohortDate > new Date()) {
        throw new HttpException(400, "Cohort date cannot be in the future");
      }

      const retention = await this.userBehaviorService.getUserRetentionMetrics(
        cohortDate,
        days
      );

      logger.info("📊 Retention metrics retrieved", {
        userId: req.userId,
        cohortDate: retention.cohortDate,
        cohortSize: retention.cohortSize,
      });

      res.status(200).json(
        ResponseUtil.success("User retention metrics retrieved successfully", retention)
      );
    } catch (error) {
      next(error);
    }
  };

  /**
   * Track custom user interaction
   * POST /api/v1/analytics/interaction
   */
  public trackInteraction = async (
    req: RequestWithUser,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const userId = req.userId!;
      const { interactionType, targetId, metadata } = req.body;

      if (!interactionType) {
        throw new HttpException(400, "Interaction type is required");
      }

      await this.userBehaviorService.trackUserInteraction(
        userId,
        interactionType,
        targetId,
        metadata
      );

      logger.info("🔄 Custom interaction tracked", {
        userId,
        interactionType,
        targetId,
      });

      res.status(200).json(
        ResponseUtil.success("Interaction tracked successfully", { tracked: true })
      );
    } catch (error) {
      next(error);
    }
  };

  /**
   * Track feature usage
   * POST /api/v1/analytics/feature-usage
   */
  public trackFeatureUsage = async (
    req: RequestWithUser,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const userId = req.userId!;
      const { featureName, featureData } = req.body;

      if (!featureName) {
        throw new HttpException(400, "Feature name is required");
      }

      await this.userBehaviorService.trackFeatureUsage(
        userId,
        featureName,
        featureData
      );

      logger.info("🎯 Feature usage tracked", {
        userId,
        featureName,
      });

      res.status(200).json(
        ResponseUtil.success("Feature usage tracked successfully", { tracked: true })
      );
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get user activity summary
   * GET /api/v1/analytics/user/activity
   */
  public getUserActivity = async (
    req: RequestWithUser,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const userId = req.userId!;
      const days = parseInt(req.query.days as string) || 7;
      const limit = parseInt(req.query.limit as string) || 50;

      if (days < 1 || days > 365) {
        throw new HttpException(400, "Days must be between 1 and 365");
      }

      if (limit < 1 || limit > 500) {
        throw new HttpException(400, "Limit must be between 1 and 500");
      }

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Get recent user activities
      const activities = await this.analyticsEventService.getUserActivityEvents(
        userId,
        limit,
        0 // offset
      );

      // Calculate summary statistics
      const summary = {
        totalActivities: activities.length,
        period: `${days} days`,
        avgPerDay: Math.round((activities.length / days) * 100) / 100,
        mostCommonActivity: this.getMostCommonActivity(activities),
      };

      logger.info("📋 User activity summary retrieved", {
        userId,
        totalActivities: summary.totalActivities,
        days,
      });

      res.status(200).json(
        ResponseUtil.success("User activity retrieved successfully", {
          activities: activities.slice(0, limit), // Ensure we don't exceed limit
          summary,
        })
      );
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get agent performance report
   * GET /api/v1/analytics/agents/:agentId/performance
   */
  public getAgentPerformance = async (
    req: RequestWithUser,
    res: Response,
    next: NextFunction
  ) => {
    console.log(`🚨🚨🚨 getAgentPerformance method called! 🚨🚨🚨`);
    try {
      console.log(`🔍 getAgentPerformance called for agent ${req.params.agentId}`);
      const agentId = parseInt(req.params.agentId);

      if (!agentId || isNaN(agentId)) {
        throw new HttpException(400, "Valid agent ID is required");
      }

      const performanceReport = await this.agentPerformanceService.generatePerformanceReport(
        agentId
      );

      logger.info("📊 Agent performance report retrieved", {
        agentId,
        totalChats: performanceReport.totalChats,
      });

      res.status(200).json(
        ResponseUtil.success("Agent performance report retrieved successfully", performanceReport)
      );
    } catch (error) {
      next(error);
    }
  };

  /**
   * Compare multiple agents performance
   * POST /api/v1/analytics/agents/compare
   */
  public compareAgentPerformance = async (
    req: RequestWithUser,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { agentIds } = req.body;

      if (!Array.isArray(agentIds) || agentIds.length === 0) {
        throw new HttpException(400, "Agent IDs array is required");
      }

      if (agentIds.length > 10) {
        throw new HttpException(400, "Maximum 10 agents can be compared at once");
      }

      const comparison = await this.agentPerformanceService.compareAgentPerformance(
        agentIds
      );

      logger.info("📊 Agent performance comparison generated", {
        agentCount: agentIds.length,
      });

      res.status(200).json(
        ResponseUtil.success("Agent performance comparison generated successfully", comparison)
      );
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get top performing agents
   * GET /api/v1/analytics/agents/top
   */
  public getTopPerformingAgents = async (
    req: RequestWithUser,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const metric = (req.query.metric as string) || 'chats';
      const limit = parseInt(req.query.limit as string) || 10;

      if (!['chats', 'satisfaction', 'efficiency', 'cost'].includes(metric)) {
        throw new HttpException(400, "Invalid metric. Use: chats, satisfaction, efficiency, or cost");
      }

      if (limit < 1 || limit > 50) {
        throw new HttpException(400, "Limit must be between 1 and 50");
      }

      const topAgents = await this.agentPerformanceService.getTopPerformingAgents(
        metric as 'chats' | 'satisfaction' | 'efficiency' | 'cost',
        undefined,
        limit
      );

      logger.info("🏆 Top performing agents retrieved", {
        metric,
        count: topAgents.length,
      });

      res.status(200).json(
        ResponseUtil.success("Top performing agents retrieved successfully", topAgents)
      );
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get model usage analytics
   * GET /api/v1/analytics/models/usage
   */
  public getModelUsage = async (
    req: RequestWithUser,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const usageSummary = await this.modelUsageService.getModelUsageSummary();

      logger.info("🤖 Model usage summary retrieved", {
        totalModels: usageSummary.totalModels,
      });

      res.status(200).json(
        ResponseUtil.success("Model usage summary retrieved successfully", usageSummary)
      );
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get model cost analysis
   * GET /api/v1/analytics/models/costs
   */
  public getModelCosts = async (
    req: RequestWithUser,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const costReport = await this.modelUsageService.calculateModelCosts();

      logger.info("💰 Model cost analysis retrieved", {
        totalCost: costReport.totalCost,
      });

      res.status(200).json(
        ResponseUtil.success("Model cost analysis retrieved successfully", costReport)
      );
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get model performance analysis
   * GET /api/v1/analytics/models/performance
   */
  public getModelPerformance = async (
    req: RequestWithUser,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const timeframe = (req.query.timeframe as string) || '7d';

      const performanceReport = await this.modelUsageService.analyzeModelPerformance(timeframe);

      logger.info("📊 Model performance analysis retrieved", {
        timeframe,
        optimalModel: performanceReport.recommendations.optimalModel,
      });

      res.status(200).json(
        ResponseUtil.success("Model performance analysis retrieved successfully", performanceReport)
      );
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get model optimization recommendations for agent
   * GET /api/v1/analytics/agents/:agentId/optimize
   */
  public getAgentOptimization = async (
    req: RequestWithUser,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const agentId = parseInt(req.params.agentId);

      if (!agentId || isNaN(agentId)) {
        throw new HttpException(400, "Valid agent ID is required");
      }

      const optimization = await this.modelUsageService.optimizeModelSelection(agentId);

      logger.info("🎯 Agent optimization recommendations retrieved", {
        agentId,
        optimalModel: optimization.optimalModel,
      });

      res.status(200).json(
        ResponseUtil.success("Agent optimization recommendations retrieved successfully", optimization)
      );
    } catch (error) {
      next(error);
    }
  };

  /**
   * Helper method to find most common activity type
   */
  private getMostCommonActivity(activities: any[]): string {
    if (activities.length === 0) return "none";

    const counts = activities.reduce((acc, activity) => {
      acc[activity.event_type] = (acc[activity.event_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(counts)
      .sort(([,a], [,b]) => (b as number) - (a as number))[0]?.[0] || "unknown";
  }
}

export default AnalyticsController;