import AnalyticsEventService from "../../analytics/services/analytics-event.service";
import AgentPerformanceAnalyticsService from "../../analytics/services/agent-performance-analytics.service";
import ModelUsageAnalyticsService from "../../analytics/services/model-usage-analytics.service";
import { EVENT_TYPES } from "../../analytics/analytics.interface";
import { estimateTokenCost } from "../../../utils/token-cost-calculator";

/**
 * Service responsible for tracking chat-related analytics
 */
class ChatAnalyticsService {
  private analyticsEventService = new AnalyticsEventService();
  private agentPerformanceService = new AgentPerformanceAnalyticsService();
  private modelUsageService = new ModelUsageAnalyticsService();

  /**
   * Track successful chat session completion
   */
  public async trackChatCompletion(params: {
    userId: number;
    agent: any;
    sessionId: number;
    userMessage: string;
    fullResponse: string;
    relevantContext: string;
    totalTime: number;
    messageCount: number;
    sourceSelection?: string;
    isFromCache: boolean;
  }): Promise<void> {
    const {
      userId,
      agent,
      sessionId,
      userMessage,
      fullResponse,
      relevantContext,
      totalTime,
      messageCount,
      sourceSelection,
      isFromCache
    } = params;

    const contextUsed = !!(relevantContext && relevantContext.length > 0);
    const estimatedTokens = Math.ceil((userMessage.length + fullResponse.length) / 4);
    const estimatedCost = estimateTokenCost(agent.provider, fullResponse.length);

    // Track chat session analytics
    await this.analyticsEventService.trackChatSession({
      userId,
      agentId: agent.id,
      sessionId,
      messageCount,
      responseTimeMs: totalTime,
      contextUsed,
      contextLength: relevantContext?.length || 0,
      sourceFirstBlocked: false,
      costEstimate: estimatedCost,
      sourceSelection,
    });

    // Track user activity for chat message send
    await this.analyticsEventService.trackUserActivity({
      userId,
      eventType: EVENT_TYPES.CHAT_MESSAGE_SEND,
      eventData: {
        agentId: agent.id,
        sessionId,
        messageLength: userMessage.length,
        responseLength: fullResponse.length,
        contextUsed,
        contextLength: relevantContext?.length || 0,
        responseTime: totalTime,
        provider: agent.provider,
        model: agent.model,
        sourceSelection,
        isFromCache,
        sentAt: new Date(),
      },
    });

    // Track model usage analytics
    await this.modelUsageService.trackModelUsage(
      agent.model,
      agent.provider,
      estimatedTokens,
      estimatedCost,
      totalTime,
      agent.id
    );

    // Track agent costs for performance analytics
    await this.agentPerformanceService.trackAgentCosts(
      agent.id,
      agent.model,
      agent.provider,
      estimatedTokens,
      estimatedCost
    );

    // Track agent performance
    await this.analyticsEventService.trackUserActivity({
      userId,
      eventType: EVENT_TYPES.CHAT_MESSAGE_RECEIVE,
      eventData: {
        agentId: agent.id,
        sessionId,
        responseTime: totalTime,
        tokenCount: estimatedTokens,
        successful: true,
        provider: agent.provider,
        model: agent.model,
      },
    });
  }

  /**
   * Track blocked chat interaction (source-first blocking)
   */
  public async trackBlockedInteraction(params: {
    userId: number;
    agentId: number;
    sessionId: number;
    userMessage: string;
    reason: string;
    totalTime: number;
    sourceSelection?: string;
  }): Promise<void> {
    const { userId, agentId, sessionId, userMessage, reason, totalTime, sourceSelection } = params;

    await this.analyticsEventService.trackChatSession({
      userId,
      agentId,
      sessionId,
      messageCount: 1,
      responseTimeMs: totalTime,
      contextUsed: false,
      contextLength: 0,
      sourceFirstBlocked: true,
      costEstimate: 0,
      sourceSelection,
    });

    await this.analyticsEventService.trackUserActivity({
      userId,
      eventType: EVENT_TYPES.CHAT_SOURCE_FIRST_BLOCK,
      eventData: {
        agentId,
        sessionId,
        reason,
        message: userMessage,
        sourceSelection,
        blockedAt: new Date(),
      },
    });
  }
}

export default ChatAnalyticsService;
