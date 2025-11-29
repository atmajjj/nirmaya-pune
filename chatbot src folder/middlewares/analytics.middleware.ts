import { NextFunction, Response } from "express";
import { RequestWithUser } from "../interfaces/auth.interface";
import AnalyticsEventService from "../features/analytics/services/analytics-event.service";
import { EVENT_TYPES, METRIC_NAMES, METRIC_UNITS } from "../features/analytics/analytics.interface";
import { logger } from "../utils/logger";

/**
 * Analytics Middleware
 * Automatically tracks user activity and API performance
 */

const analyticsEventService = new AnalyticsEventService();

export const analyticsMiddleware = (req: RequestWithUser, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  const originalSend = res.send;
  
  // Override res.send to capture response data
  res.send = function(data) {
    const responseTime = Date.now() - startTime;
    
    // Track analytics asynchronously to not block the response
    setImmediate(async () => {
      try {
        const userId = req.userId || req.user?.id;
        const endpoint = req.route?.path || req.path;
        const method = req.method;
        const statusCode = res.statusCode;
        const userAgent = req.get('User-Agent');
        const ipAddress = req.ip || req.connection.remoteAddress;
        const sessionId = req.headers['x-session-id'] as string;

        // Track API request performance
        await analyticsEventService.trackApiRequest(
          endpoint,
          method,
          responseTime,
          statusCode,
          userId
        );

        // Track user activity for authenticated requests
        if (userId) {
          await analyticsEventService.trackUserActivity({
            userId,
            eventType: EVENT_TYPES.API_REQUEST,
            eventData: {
              endpoint,
              method,
              statusCode,
              responseTime,
              bodySize: req.body ? JSON.stringify(req.body).length : 0,
            },
            sessionId,
            ipAddress,
            userAgent,
          });
        }

        // Track specific endpoint events
        await trackSpecificEndpointEvents(req, res, userId);

      } catch (error) {
        logger.error("❌ Analytics middleware error", {
          error: error.message,
          endpoint: req.path,
          method: req.method,
        });
      }
    });

    return originalSend.call(this, data);
  };

  next();
};

/**
 * Track specific events based on endpoint patterns
 */
async function trackSpecificEndpointEvents(req: RequestWithUser, res: Response, userId?: number) {
  if (!userId) return;

  const endpoint = req.path;
  const method = req.method;
  const statusCode = res.statusCode;

  try {
    // Track authentication events
    if (endpoint.includes('/login') && method === 'POST' && statusCode === 200) {
      await analyticsEventService.trackUserActivity({
        userId,
        eventType: EVENT_TYPES.USER_LOGIN,
        eventData: {
          loginTime: new Date(),
          userAgent: req.get('User-Agent'),
          ipAddress: req.ip,
        },
      });
    }

    if (endpoint.includes('/logout') && method === 'POST') {
      await analyticsEventService.trackUserActivity({
        userId,
        eventType: EVENT_TYPES.USER_LOGOUT,
        eventData: {
          logoutTime: new Date(),
        },
      });
    }

    // Track agent events
    if (endpoint.includes('/agents') && method === 'POST' && statusCode === 201) {
      await analyticsEventService.trackUserActivity({
        userId,
        eventType: EVENT_TYPES.AGENT_CREATE,
        eventData: {
          agentData: sanitizeAgentData(req.body),
          createdAt: new Date(),
        },
      });
    }

    if (endpoint.includes('/agents') && method === 'PUT' && statusCode === 200) {
      const agentId = extractAgentIdFromPath(endpoint);
      await analyticsEventService.trackUserActivity({
        userId,
        eventType: EVENT_TYPES.AGENT_UPDATE,
        eventData: {
          agentId,
          updateData: sanitizeAgentData(req.body),
          updatedAt: new Date(),
        },
      });
    }

    if (endpoint.includes('/agents') && method === 'DELETE' && statusCode === 200) {
      const agentId = extractAgentIdFromPath(endpoint);
      await analyticsEventService.trackUserActivity({
        userId,
        eventType: EVENT_TYPES.AGENT_DELETE,
        eventData: {
          agentId,
          deletedAt: new Date(),
        },
      });
    }

    // Track chat events
    if (endpoint.includes('/chat/agents') && method === 'POST' && statusCode === 200) {
      const agentId = extractAgentIdFromPath(endpoint);
      await analyticsEventService.trackUserActivity({
        userId,
        eventType: EVENT_TYPES.CHAT_MESSAGE_SEND,
        eventData: {
          agentId,
          messageCount: req.body?.messages?.length || 1,
          hasNewSession: req.body?.new_session || false,
          sentAt: new Date(),
        },
      });
    }

    // Track source events
    if (endpoint.includes('/sources') && method === 'POST' && statusCode === 201) {
      await analyticsEventService.trackUserActivity({
        userId,
        eventType: EVENT_TYPES.SOURCE_CREATE,
        eventData: {
          sourceType: req.body?.source_type,
          sourceName: req.body?.name,
          agentId: req.body?.agent_id,
          createdAt: new Date(),
        },
      });
    }

    // Track training events
    if (endpoint.includes('/train') && method === 'POST' && statusCode === 200) {
      const agentId = extractAgentIdFromPath(endpoint);
      await analyticsEventService.trackUserActivity({
        userId,
        eventType: EVENT_TYPES.AGENT_TRAIN_START,
        eventData: {
          agentId,
          trainingStarted: new Date(),
        },
      });
    }

  } catch (error) {
    logger.error("❌ Failed to track specific endpoint events", {
      error: error.message,
      endpoint,
      method,
      userId,
    });
  }
}

/**
 * Sanitize agent data for analytics (remove sensitive information)
 */
function sanitizeAgentData(agentData: any): any {
  if (!agentData) return {};
  
  const sanitized = { ...agentData };
  
  // Remove sensitive fields
  delete sanitized.api_key;
  delete sanitized.encrypted_api_key;
  delete sanitized.encryption_salt;
  
  return sanitized;
}

/**
 * Extract agent ID from URL path
 */
function extractAgentIdFromPath(path: string): number | undefined {
  const agentIdMatch = path.match(/\/agents\/(\d+)/);
  return agentIdMatch ? parseInt(agentIdMatch[1], 10) : undefined;
}

/**
 * Track chat session analytics
 */
export const trackChatSessionAnalytics = async (
  userId: number,
  agentId: number,
  sessionId: number,
  messageCount: number,
  responseTime: number,
  contextUsed: boolean,
  contextLength: number,
  sourceFirstBlocked: boolean,
  costEstimate?: number
) => {
  try {
    await analyticsEventService.trackChatSession({
      userId,
      agentId,
      sessionId,
      messageCount,
      responseTimeMs: responseTime,
      contextUsed,
      contextLength,
      sourceFirstBlocked,
      costEstimate,
    });
  } catch (error) {
    logger.error("❌ Failed to track chat session analytics", {
      error: error.message,
      userId,
      agentId,
      sessionId,
    });
  }
};

/**
 * Track system performance metrics
 */
export const trackSystemPerformance = async (
  metricName: string,
  metricValue: number,
  metricUnit: string,
  tags?: Record<string, any>
) => {
  try {
    await analyticsEventService.trackSystemMetric({
      metricName,
      metricValue,
      metricUnit,
      metricTags: tags,
    });
  } catch (error) {
    logger.error("❌ Failed to track system performance", {
      error: error.message,
      metricName,
    });
  }
};

/**
 * Track database query performance
 */
export const trackDatabaseQuery = async (
  queryType: string,
  executionTime: number,
  tableName?: string
) => {
  try {
    await analyticsEventService.trackSystemMetric({
      metricName: METRIC_NAMES.DATABASE_QUERY_TIME,
      metricValue: executionTime,
      metricUnit: METRIC_UNITS.MILLISECONDS,
      metricTags: {
        queryType,
        tableName,
      },
    });
  } catch (error) {
    logger.error("❌ Failed to track database query", {
      error: error.message,
      queryType,
    });
  }
};

/**
 * Track cache performance
 */
export const trackCachePerformance = async (
  cacheType: string,
  hitRate: number,
  operationType: 'hit' | 'miss' | 'set' | 'delete'
) => {
  try {
    await analyticsEventService.trackSystemMetric({
      metricName: METRIC_NAMES.CACHE_HIT_RATE,
      metricValue: hitRate,
      metricUnit: METRIC_UNITS.PERCENTAGE,
      metricTags: {
        cacheType,
        operationType,
      },
    });
  } catch (error) {
    logger.error("❌ Failed to track cache performance", {
      error: error.message,
      cacheType,
    });
  }
};