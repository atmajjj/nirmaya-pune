import DB from "../../../../database/index.schema";
import { logger } from "../../../utils/logger";
import { EVENT_TYPES, METRIC_NAMES, METRIC_UNITS } from "../analytics.interface";
import AnalyticsEventService from "./analytics-event.service";

/**
 * User Behavior Analytics Service
 * Tracks and analyzes user patterns, session behavior, and engagement metrics
 */
class UserBehaviorService {
  private analyticsEventService = new AnalyticsEventService();

  /**
   * Track user interaction patterns
   */
  public async trackUserInteraction(
    userId: number,
    interactionType: string,
    targetId?: number,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      await this.analyticsEventService.trackUserActivity({
        userId,
        eventType: interactionType,
        eventData: {
          targetId,
          interactionTime: new Date(),
          ...metadata,
        },
      });

      logger.info("🔄 User interaction tracked", {
        userId,
        interactionType,
        targetId,
      });
    } catch (error) {
      logger.error("❌ Failed to track user interaction", {
        error: error.message,
        userId,
        interactionType,
      });
    }
  }

  /**
   * Analyze user engagement patterns over time periods
   */
  public async analyzeUserEngagement(userId: number, days?: number): Promise<any> {
    try {
      const startDate = days ? new Date() : null;
      if (startDate && days) {
        startDate.setDate(startDate.getDate() - days);
      }

      // Get user activity for the specified period (or all time if no days specified)
      let query = DB("user_activity_events")
        .where("user_id", userId);

      if (startDate) {
        query = query.where("created_at", ">=", startDate);
      }

      const activities = await query.orderBy("created_at", "desc");

      // Calculate engagement metrics
      const totalActivities = activities.length;
      const uniqueDays = new Set(
        activities.map(activity => activity.created_at.toDateString())
      ).size;

      const eventTypeCounts = activities.reduce((acc, activity) => {
        acc[activity.event_type] = (acc[activity.event_type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Calculate daily activity averages
      const dailyActivityAvg = uniqueDays > 0 ? totalActivities / uniqueDays : 0;

      // Find most active hours
      const hourlyActivity = activities.reduce((acc, activity) => {
        const hour = new Date(activity.created_at).getHours();
        acc[hour] = (acc[hour] || 0) + 1;
        return acc;
      }, {} as Record<number, number>);

      const mostActiveHour = Object.entries(hourlyActivity)
        .sort(([,a], [,b]) => (b as number) - (a as number))[0]?.[0] || "0";

      const engagement = {
        userId,
        totalActivities,
        uniqueActiveDays: uniqueDays,
        dailyActivityAverage: Math.round(dailyActivityAvg * 100) / 100,
        mostActiveHour: parseInt(mostActiveHour as string),
        eventTypeBreakdown: eventTypeCounts,
        engagementScore: this.calculateEngagementScore(totalActivities, uniqueDays, days || 30), // Default to 30 days for score calculation
      };

      logger.info("📊 User engagement analyzed", {
        userId,
        engagementScore: engagement.engagementScore,
        totalActivities,
      });

      return engagement;
    } catch (error) {
      logger.error("❌ Failed to analyze user engagement", {
        error: error.message,
        userId,
      });
      throw error;
    }
  }

  /**
   * Get user behavior insights for multiple users
   */
  public async getUserBehaviorInsights(
    startDate: Date,
    endDate: Date,
    limit: number = 100
  ): Promise<any> {
    try {
      // Get aggregated user behavior data
      const behaviorData = await DB("user_activity_events")
        .select("user_id")
        .count("* as total_activities")
        .where("created_at", ">=", startDate)
        .where("created_at", "<=", endDate)
        .groupBy("user_id")
        .orderBy("total_activities", "desc")
        .limit(limit);

      // Get unique days separately for each user
      const uniqueDaysData = await DB.raw(`
        SELECT user_id, COUNT(DISTINCT DATE(created_at)) as unique_days
        FROM user_activity_events
        WHERE created_at >= ? AND created_at <= ?
        GROUP BY user_id
      `, [startDate, endDate]);

      // Get most common event types
      const eventTypeStats = await DB("user_activity_events")
        .select("event_type")
        .count("* as count")
        .where("created_at", ">=", startDate)
        .where("created_at", "<=", endDate)
        .groupBy("event_type")
        .orderBy("count", "desc");

      // Calculate period metrics
      const periodDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      
      // Create a map for quick lookup of unique days
      const uniqueDaysMap = uniqueDaysData.rows.reduce((acc: any, item: any) => {
        acc[item.user_id] = parseInt(item.unique_days);
        return acc;
      }, {} as Record<number, number>);
      
      const insights = {
        period: {
          startDate,
          endDate,
          days: periodDays,
        },
        userBehavior: behaviorData.map(user => {
          const uniqueDays = uniqueDaysMap[user.user_id] || 1;
          return {
            userId: user.user_id,
            totalActivities: parseInt(user.total_activities),
            uniqueActiveDays: uniqueDays,
            avgDailyActivity: Math.round((user.total_activities / uniqueDays) * 100) / 100,
            engagementScore: this.calculateEngagementScore(
              parseInt(user.total_activities),
              uniqueDays,
              periodDays
            ),
          };
        }),
        eventTypeDistribution: eventTypeStats.map(stat => ({
          eventType: stat.event_type,
          count: parseInt(stat.count),
          percentage: Math.round((stat.count / behaviorData.reduce((sum, u) => sum + parseInt(u.total_activities), 0)) * 10000) / 100,
        })),
        summary: {
          totalUsers: behaviorData.length,
          totalActivities: behaviorData.reduce((sum, user) => sum + parseInt(user.total_activities), 0),
          avgActivitiesPerUser: Math.round((behaviorData.reduce((sum, user) => sum + parseInt(user.total_activities), 0) / behaviorData.length) * 100) / 100,
        },
      };

      logger.info("📈 User behavior insights generated", {
        totalUsers: insights.summary.totalUsers,
        totalActivities: insights.summary.totalActivities,
        period: periodDays,
      });

      return insights;
    } catch (error) {
      logger.error("❌ Failed to get user behavior insights", {
        error: error.message,
        startDate,
        endDate,
      });
      throw error;
    }
  }

  /**
   * Track user feature usage patterns
   */
  public async trackFeatureUsage(
    userId: number,
    featureName: string,
    featureData?: Record<string, any>
  ): Promise<void> {
    try {
      await this.analyticsEventService.trackUserActivity({
        userId,
        eventType: EVENT_TYPES.API_REQUEST,
        eventData: {
          featureName,
          timestamp: new Date(),
          ...featureData,
        },
      });

      logger.info("🎯 Feature usage tracked", {
        userId,
        featureName,
      });
    } catch (error) {
      logger.error("❌ Failed to track feature usage", {
        error: error.message,
        userId,
        featureName,
      });
    }
  }

  /**
   * Calculate engagement score based on activity and consistency
   */
  private calculateEngagementScore(
    totalActivities: number,
    uniqueDays: number,
    periodDays: number
  ): number {
    // Engagement score: (activities per day * consistency factor) * 10
    // Consistency factor: unique active days / total period days
    const avgActivitiesPerDay = totalActivities / Math.max(uniqueDays, 1);
    const consistencyFactor = uniqueDays / Math.max(periodDays, 1);
    
    const score = Math.min((avgActivitiesPerDay * consistencyFactor) * 10, 100);
    return Math.round(score * 100) / 100;
  }

  /**
   * Get user retention metrics
   */
  public async getUserRetentionMetrics(cohortStartDate: Date, days: number = 30): Promise<any> {
    try {
      const cohortEndDate = new Date(cohortStartDate);
      cohortEndDate.setDate(cohortEndDate.getDate() + 1);

      // Get users who registered in the cohort period
      const cohortUsers = await DB("users")
        .select("id", "created_at")
        .where("created_at", ">=", cohortStartDate)
        .where("created_at", "<", cohortEndDate);

      if (cohortUsers.length === 0) {
        return {
          cohortDate: cohortStartDate,
          cohortSize: 0,
          retentionByDay: [],
        };
      }

      // Calculate retention for each day
      const retentionByDay = [];
      for (let day = 1; day <= days; day++) {
        const checkDate = new Date(cohortStartDate);
        checkDate.setDate(checkDate.getDate() + day);
        
        const nextDate = new Date(checkDate);
        nextDate.setDate(nextDate.getDate() + 1);

        const activeUsers = await DB("user_activity_events")
          .whereIn("user_id", cohortUsers.map(u => u.id))
          .where("created_at", ">=", checkDate)
          .where("created_at", "<", nextDate)
          .countDistinct("user_id as count")
          .first();

        const retentionRate = (Number(activeUsers.count) / cohortUsers.length) * 100;

        retentionByDay.push({
          day,
          date: checkDate.toISOString().split('T')[0],
          activeUsers: Number(activeUsers.count),
          retentionRate: Math.round(retentionRate * 100) / 100,
        });
      }

      const metrics = {
        cohortDate: cohortStartDate.toISOString().split('T')[0],
        cohortSize: cohortUsers.length,
        retentionByDay,
        summary: {
          day1Retention: retentionByDay[0]?.retentionRate || 0,
          day7Retention: retentionByDay[6]?.retentionRate || 0,
          day30Retention: retentionByDay[29]?.retentionRate || 0,
        },
      };

      logger.info("📊 User retention metrics calculated", {
        cohortDate: metrics.cohortDate,
        cohortSize: metrics.cohortSize,
        day1Retention: metrics.summary.day1Retention,
      });

      return metrics;
    } catch (error) {
      logger.error("❌ Failed to calculate retention metrics", {
        error: error.message,
        cohortStartDate,
      });
      throw error;
    }
  }
}

export default UserBehaviorService;