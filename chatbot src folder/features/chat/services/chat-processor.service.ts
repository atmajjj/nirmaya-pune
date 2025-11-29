import HttpException from "../../../exceptions/HttpException";
import { AgentChatDto } from "../chat.dto";
import { logger } from "../../../utils/logger";
import { chatConfig } from '../../../config/chat.config';
import { searchConfig } from '../../../config/search.config';
import conversationSummarizationService from "./conversation-summarization.service";

// Import specialized services
import AiProcessingService from "./ai-processing.service";
import ChatContextService from "./chat-context.service";
import ChatAnalyticsService from "./chat-analytics.service";
import SourceGuardService from "./source-guard.service";
import ChatSessionService from "./chat-session.service";
import AgentService from "../../agent/services/agent.service";
import agentCacheService from "../../agent/services/agent-cache.service";

/**
 * Service responsible for processing chat messages and coordinating AI responses
 * Handles the complex chat flow with parallel processing optimization
 */
class ChatProcessorService {
  // Initialize specialized services
  private aiProcessingService = new AiProcessingService();
  private chatContextService = new ChatContextService();
  private chatAnalyticsService = new ChatAnalyticsService();
  private sourceGuardService = new SourceGuardService();
  private chatSessionService = new ChatSessionService();
  private agentService = new AgentService();

  /**
   * Generate enhanced system prompt based on context and intent
   */
  private generateEnhancedSystemPrompt(
    basePrompt: string,
    hasContext: boolean,
    availableTopics: string[],
    isGreeting: boolean,
    context?: string
  ): string {
    return this.chatContextService.generateEnhancedSystemPrompt(
      basePrompt,
      hasContext,
      availableTopics,
      isGreeting,
      context
    );
  }

  /**
   * Get cached agent or fetch from database
   */
  private async getCachedAgent(agentId: number, userId: number) {
    return await agentCacheService.getOrFetch(agentId, userId, async () => {
      return await this.agentService.getAgentById(agentId, userId);
    });
  }

  /**
   * Enhanced context search with configurable search strategies
   */
  private async getRelevantContext(
    query: string,
    userId: number,
    agentId: number,
    sourceSelection?: string,
    searchStrategy: 'pinecone_hybrid' | 'semantic_only' = 'pinecone_hybrid',
    enableReranking = true,
    rerankModel?: string
  ): Promise<{ contextText: string; contextSources: any[] }> {
    return await this.chatContextService.getRelevantContext(
      query,
      userId,
      agentId,
      sourceSelection,
      searchStrategy,
      enableReranking,
      rerankModel
    );
  }

  /**
   * Handle agent-based chat with session management (with parallel processing optimization)
   */
  public async handleAgentChat(
    agentId: number,
    userId: number,
    data: AgentChatDto,
    sessionId?: number
  ): Promise<any> {
    const startTime = Date.now();

    try {
      const { messages } = data;

      if (!messages || !Array.isArray(messages)) {
        throw new HttpException(400, "Invalid messages format");
      }

      // Extract user message early for validation
      const userMessage = messages[messages.length - 1];
      if (!userMessage || userMessage.role !== "user") {
        throw new HttpException(400, "Last message must be from user");
      }

      // SOURCE-FIRST BEHAVIOR: Check intent and handle blocking
      const isGreeting = this.sourceGuardService.isAllowedWithoutSources(userMessage.content);
      const isGeneralKnowledge = this.sourceGuardService.isGeneralKnowledgeQuery(userMessage.content);

      // Block general knowledge queries immediately
      if (isGeneralKnowledge && !isGreeting) {
        const blockedResponse = this.sourceGuardService.generateGeneralKnowledgeDecline();

        // Create session if needed for saving the blocked interaction
        const session = sessionId
          ? await this.chatSessionService.getOrCreateSession(agentId, userId, sessionId)
          : await this.chatSessionService.getOrCreateSession(agentId, userId);

        // Save user message and blocked response
        await this.chatSessionService.saveMessage(session.id, userMessage.content, "user", userId);
        await this.chatSessionService.saveMessage(session.id, blockedResponse, "assistant", userId);

        // Log the blocking decision
        this.sourceGuardService.logSourceFirstDecision(
          userMessage.content,
          false,           // hasContext
          isGreeting,      // isGreeting
          isGeneralKnowledge, // isGeneralKnowledge
          userId,
          agentId
        );

        // Track analytics for blocked interaction using specialized service
        await this.chatAnalyticsService.trackBlockedInteraction({
          userId,
          agentId,
          sessionId: session.id,
          userMessage: userMessage.content,
          reason: "general_knowledge_query",
          totalTime: Date.now() - startTime,
          sourceSelection: data.sourceSelection,
        });

        return {
          message: blockedResponse,
          sessionId: session.id,
          blocked: true,
          reason: "general_knowledge_query",
          sourceFirst: true,
          performance: {
            totalTime: `${Date.now() - startTime}ms`,
            vectorSearchTime: "0ms",
            contextLength: 0
          }
        };
      }

      // PHASE 1: Run independent operations in parallel
      const phase1Start = Date.now();

      // First get the agent (needed for API key decryption)
      const agent = await this.getCachedAgent(agentId, userId);

      // Now run parallel operations that can use agent data
      const [session, contextResult] = await Promise.all([
        // 1. Get or create session
        sessionId
          ? this.chatSessionService.getOrCreateSession(agentId, userId, sessionId)
          : this.chatSessionService.getOrCreateSession(agentId, userId),

        // 2. Search for relevant context
        this.getRelevantContext(
          userMessage.content,
          userId,
          agentId,
          data.sourceSelection,
          data.searchStrategy === 'simple_hybrid' ? 'pinecone_hybrid' : (data.searchStrategy || searchConfig.global.defaultStrategy as 'pinecone_hybrid' | 'semantic_only'),
          data.enableReranking === true ? true : searchConfig.reranking.enableByDefault,
          data.rerankModel
        ),
      ]);
      const phase1Time = Date.now() - phase1Start;

      // Extract context information
      const relevantContext = contextResult.contextText;
      const contextSources = contextResult.contextSources;

      // Validate agent after parallel fetch
      if (!agent.is_active) {
        throw new HttpException(400, "Agent is not active");
      }

      // PHASE 2: Sequential operations that depend on Phase 1 results
      const phase2Start = Date.now();
      // Save user message (depends on session)
      await this.chatSessionService.saveMessage(
        session.id,
        userMessage.content,
        "user",
        userId
      );

      // Get conversation history (depends on session)
      const conversationHistory = await this.chatSessionService.getSessionMessages(session.id, userId);
      const phase2Time = Date.now() - phase2Start;

      // PHASE 3: Prepare AI request data and generate response
      // Prepare enhanced system prompt based on context and intent
      const baseSystemPrompt = agent.system_prompt ||
        chatConfig.prompts.fallbackSystemPrompt;

      // For now, we'll extract topics from the context if available
      const availableTopics: string[] = [];
      const hasContext = !!(relevantContext && relevantContext.length > 0);

      // Generate enhanced system prompt using the context service
      const systemContent = this.generateEnhancedSystemPrompt(
        baseSystemPrompt,
        hasContext,
        availableTopics,
        isGreeting,
        relevantContext
      );

      // Add conversation history (summarized if needed)
      const dbMessages = await conversationSummarizationService.getSummarizedHistory(
        session.id,
        conversationHistory
      );

      // PHASE 4: Generate AI response using AI processing service
      const { response: fullResponse, isFromCache } = await this.aiProcessingService.generateResponse(
        agent,
        userMessage.content,
        systemContent,
        dbMessages as any[],
        relevantContext,
        userId
      );

      // PHASE 4: Save AI response and return result
      // Save AI response (final sequential operation)
      await this.chatSessionService.saveMessage(
        session.id,
        fullResponse,
        "assistant",
        userId
      );

      const totalTime = Date.now() - startTime;

      // Track analytics for successful chat completion using specialized service
      const messageCount = dbMessages.length;

      await this.chatAnalyticsService.trackChatCompletion({
        userId,
        agent,
        sessionId: session.id,
        userMessage: userMessage.content,
        fullResponse,
        relevantContext,
        totalTime,
        messageCount,
        sourceSelection: data.sourceSelection,
        isFromCache,
      });

      // Log performance metrics for monitoring parallel processing improvements
      logger.info(`🚀 Chat processed with parallel optimization:`, {
        totalTime: `${totalTime}ms`,
        phase1Time: `${phase1Time}ms`,
        phase2Time: `${phase2Time}ms`,
        agentId,
        userId,
        contextLength: relevantContext?.length || 0,
        parallelOperations: "agent+session+context"
      });

      return {
        message: fullResponse,
        model: agent.model,
        provider: agent.provider,
        sessionId: session.id,
        agentId: agent.id,
        agentName: agent.name,
        contextUsed: !!(relevantContext && relevantContext.length > 0),
        contextLength: relevantContext ? relevantContext.length : 0,
        contextSources: contextSources,
        performance: {
          totalTime: `${totalTime}ms`,
          parallelPhase: `${phase1Time}ms`,
          sequentialPhase: `${phase2Time}ms`
        }
      };
    } catch (error: any) {
      // Handle specific error types
      if (error instanceof Error && error.message.includes("Rate limit")) {
        throw new HttpException(
          429,
          chatConfig.aiProcessing.generalRateLimitMessage
        );
      }

      if (error instanceof HttpException) throw error;
      throw new HttpException(
        500,
        `An error occurred processing the agent chat: ${error.message}`
      );
    }
  }
}

export default ChatProcessorService;