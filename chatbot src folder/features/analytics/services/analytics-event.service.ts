import knex from "../../../../database/index.schema";
import { logger } from "../../../utils/logger";
import {
  AnalyticsEvent,
  ChatSessionAnalytics,
  AgentPerformanceData,
  SystemMetric,
  EVENT_TYPES,
  METRIC_NAMES,
  METRIC_UNITS,
} from "../analytics.interface";
import {
  USER_ACTIVITY_EVENTS_TABLE,
  CHAT_ANALYTICS_TABLE,
  AGENT_PERFORMANCE_METRICS_TABLE,
  SYSTEM_PERFORMANCE_METRICS_TABLE,
} from "../analytics.schema";
import HttpException from "../../../exceptions/HttpException";

/**
 * Analytics Event Service
 * Core service for tracking all analytics events in the Chatverse platform
 */
class AnalyticsEventService {
  /**
   * Track user activity events
   */
  public async trackUserActivity(event: AnalyticsEvent): Promise<void> {
    try {
      // Validate that the user exists before inserting
      const userExists = await knex('users')
        .where({ id: event.userId, is_deleted: false })
        .first();

      if (!userExists) {
        logger.warn("⚠️ Skipping user activity tracking for non-existent user", {
          userId: event.userId,
          eventType: event.eventType,
        });
        return;
      }

      await knex(USER_ACTIVITY_EVENTS_TABLE).insert({
        user_id: event.userId,
        event_type: event.eventType,
        event_data: JSON.stringify(event.eventData),
        session_id: event.sessionId,
        ip_address: event.ipAddress,
        user_agent: event.userAgent,
        created_at: new Date(),
      });

      logger.info("📊 User activity tracked", {
        userId: event.userId,
        eventType: event.eventType,
        sessionId: event.sessionId,
      });
    } catch (error) {
      logger.error("❌ Failed to track user activity", {
        error: error.message,
        event,
      });
      // Don't throw error to avoid breaking main functionality
    }
  }

  /**
   * Track chat-specific analytics
   */
  public async trackChatSession(sessionAnalytics: ChatSessionAnalytics): Promise<void> {
    try {
      await knex(CHAT_ANALYTICS_TABLE).insert({
        user_id: sessionAnalytics.userId,
        agent_id: sessionAnalytics.agentId,
        session_id: sessionAnalytics.sessionId,
        message_count: sessionAnalytics.messageCount,
        session_duration_seconds: sessionAnalytics.sessionDurationSeconds,
        context_used: sessionAnalytics.contextUsed,
        context_length: sessionAnalytics.contextLength,
        source_first_blocked: sessionAnalytics.sourceFirstBlocked,
        response_time_ms: sessionAnalytics.responseTimeMs,
        cost_estimate: sessionAnalytics.costEstimate,
        user_satisfaction_score: sessionAnalytics.userSatisfactionScore,
        created_at: new Date(),
      });

      logger.info("📊 Chat session analytics tracked", {
        userId: sessionAnalytics.userId,
        agentId: sessionAnalytics.agentId,
        sessionId: sessionAnalytics.sessionId,
        messageCount: sessionAnalytics.messageCount,
      });
    } catch (error) {
      logger.error("❌ Failed to track chat analytics", {
        error: error.message,
        sessionAnalytics,
      });
      // Don't throw error to avoid breaking main functionality
    }
  }

  /**
   * Track system performance metrics
   */
  public async trackSystemMetric(metric: SystemMetric): Promise<void> {
    try {
      await knex(SYSTEM_PERFORMANCE_METRICS_TABLE).insert({
        metric_name: metric.metricName,
        metric_value: metric.metricValue,
        metric_unit: metric.metricUnit,
        metric_tags: metric.metricTags ? JSON.stringify(metric.metricTags) : null,
        recorded_at: metric.recordedAt || new Date(),
      });

      logger.debug("📊 System metric tracked", {
        metricName: metric.metricName,
        metricValue: metric.metricValue,
        metricUnit: metric.metricUnit,
      });
    } catch (error) {
      logger.error("❌ Failed to track system metric", {
        error: error.message,
        metric,
      });
      // Don't throw error to avoid breaking main functionality
    }
  }

  /**
   * Get user activity events with pagination
   */
  public async getUserActivityEvents(
    userId: number,
    limit: number = 50,
    offset: number = 0,
    eventType?: string
  ) {
    try {
      let query = knex(USER_ACTIVITY_EVENTS_TABLE)
        .where({ user_id: userId })
        .orderBy("created_at", "desc")
        .limit(limit)
        .offset(offset);

      if (eventType) {
        query = query.where({ event_type: eventType });
      }

      const events = await query;
      return events;
    } catch (error) {
      logger.error("❌ Failed to get user activity events", {
        error: error.message,
        userId,
      });
      throw new HttpException(500, `Failed to retrieve user activity: ${error.message}`);
    }
  }

  /**
   * Track API request performance
   */
  public async trackApiRequest(
    endpoint: string,
    method: string,
    responseTime: number,
    statusCode: number,
    userId?: number
  ): Promise<void> {
    try {
      // Track as user activity if user is present
      if (userId) {
        await this.trackUserActivity({
          userId,
          eventType: EVENT_TYPES.API_REQUEST,
          eventData: {
            endpoint,
            method,
            responseTime,
            statusCode,
          },
        });
      }

      // Track as system metric
      await this.trackSystemMetric({
        metricName: METRIC_NAMES.API_RESPONSE_TIME,
        metricValue: responseTime,
        metricUnit: METRIC_UNITS.MILLISECONDS,
        metricTags: {
          endpoint,
          method,
          statusCode,
        },
      });
    } catch (error) {
      logger.error("❌ Failed to track API request", {
        error: error.message,
        endpoint,
        method,
      });
    }
  }

}

export default AnalyticsEventService;