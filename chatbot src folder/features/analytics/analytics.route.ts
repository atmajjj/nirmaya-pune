import { Router } from "express";
import AnalyticsController from "./analytics.controller";
import validationMiddleware from "../../middlewares/validation.middleware";
import { TrackInteractionDto, TrackFeatureUsageDto } from "./analytics.dto";

/**
 * Analytics Routes for Phase 2 User Behavior Analytics
 * All routes require authentication
 */
class AnalyticsRoute {
  public path = "/analytics";
  public router = Router();
  public analyticsController = new AnalyticsController();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    // User-specific analytics endpoints
    this.router.get(
      `${this.path}/user/engagement`,
      this.analyticsController.getUserEngagement
    );

    this.router.get(
      `${this.path}/user/activity`,
      this.analyticsController.getUserActivity
    );

    this.router.post(
      `${this.path}/interaction`,
      validationMiddleware(TrackInteractionDto, "body", false, []),
      this.analyticsController.trackInteraction
    );

    this.router.post(
      `${this.path}/feature-usage`,
      validationMiddleware(TrackFeatureUsageDto, "body", false, []),
      this.analyticsController.trackFeatureUsage
    );

    // Admin/system analytics endpoints (require admin role in future)
    this.router.get(
      `${this.path}/behavior/insights`,
      this.analyticsController.getBehaviorInsights
    );

    this.router.get(
      `${this.path}/retention`,
      this.analyticsController.getRetentionMetrics
    );

    // Phase 3: Agent Performance Analytics endpoints
    this.router.get(
      `${this.path}/agents/:agentId/performance`,
      this.analyticsController.getAgentPerformance
    );

    this.router.post(
      `${this.path}/agents/compare`,
      this.analyticsController.compareAgentPerformance
    );

    this.router.get(
      `${this.path}/agents/top`,
      this.analyticsController.getTopPerformingAgents
    );

    this.router.get(
      `${this.path}/agents/:agentId/optimize`,
      this.analyticsController.getAgentOptimization
    );

    // Phase 3: Model Usage Analytics endpoints
    this.router.get(
      `${this.path}/models/usage`,
      this.analyticsController.getModelUsage
    );

    this.router.get(
      `${this.path}/models/costs`,
      this.analyticsController.getModelCosts
    );

    this.router.get(
      `${this.path}/models/performance`,
      this.analyticsController.getModelPerformance
    );
  }
}

export default AnalyticsRoute;