import {
  languageModels,
  modelID,
  defaultModel,
} from "../../provider_model/providers";
import HttpException from "../../../exceptions/HttpException";
import { streamText, CoreMessage } from "ai";
import { AgentChatDto } from "../chat.dto";
import { logger } from "../../../utils/logger";
import { chatConfig } from '../../../config/chat.config';

// Import specialized services
import ChatProcessorService from "./chat-processor.service";
import ChatSessionService from "./chat-session.service";
import AgentService from "../../agent/services/agent.service";
import agentCacheService from "../../agent/services/agent-cache.service";

/**
 * Service responsible for orchestrating chat operations and session management
 * Acts as the main entry point for chat functionality
 */
class ChatOrchestratorService {
  // Initialize services
  private chatProcessorService = new ChatProcessorService();
  private chatSessionService = new ChatSessionService();
  private agentService = new AgentService();

  /**
   * Get cached agent or fetch from database
   */
  private async getCachedAgent(agentId: number, userId: number) {
    return await agentCacheService.getOrFetch(agentId, userId, async () => {
      return await this.agentService.getAgentById(agentId, userId);
    });
  }

  /**
   * Create a new session with agent validation
   */
  public async createNewSession(agentId: number, userId: number) {
    try {
      // Use cached agent lookup
      const agent = await this.getCachedAgent(agentId, userId);
      if (!agent.is_active) {
        throw new HttpException(400, "Agent is not active");
      }

      const session = await this.chatSessionService.createChatSession(
        agentId,
        userId
      );

      return {
        id: session.id,
        agent_id: session.agent_id,
        agent_name: agent.name,
        created_at: session.created_at,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        500,
        `Error creating new session: ${error.message}`
      );
    }
  }

  /**
   * Helper method to get session by ID with validation
   */
  private async getSessionById(
    sessionId: number,
    userId: number,
    agentId: number
  ) {
    const session = await this.chatSessionService.getOrCreateSession(
      agentId,
      userId,
      sessionId
    );

    // Verify session belongs to the correct agent
    if (session.agent_id !== agentId) {
      throw new HttpException(400, "Session does not belong to this agent");
    }

    return session;
  }

  /**
   * Get chat history for a session
   */
  public async getChatHistory(sessionId: number, userId: number) {
    try {
      const messages = await this.chatSessionService.getSessionMessages(
        sessionId,
        userId
      );
      return {
        session_id: sessionId,
        messages: messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
          created_at: msg.created_at,
        })),
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        500,
        `Error fetching chat history: ${error.message}`
      );
    }
  }

  /**
   * Get user's chat sessions with summary
   */
  public async getUserChatSessions(userId: number, agentId?: number) {
    try {
      const sessions = await this.chatSessionService.getUserAgentSessions(
        userId,
        agentId
      );

      // Get session summaries with message count and last message
      const sessionSummaries = await Promise.all(
        sessions.map(async (session) => {
          const messages = await this.chatSessionService.getSessionMessages(
            session.id,
            userId
          );
          const lastMessage = messages[messages.length - 1];

          return {
            id: session.id,
            agent_id: session.agent_id,
            created_at: session.created_at,
            message_count: messages.length,
            last_message: lastMessage?.content || "No messages",
            last_message_time: lastMessage?.created_at || session.created_at,
          };
        })
      );

      return sessionSummaries;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        500,
        `Error fetching user sessions: ${error.message}`
      );
    }
  }

  /**
   * Handle agent-based chat with session management
   * Delegates to ChatProcessorService for the actual processing
   */
  public async handleAgentChat(
    agentId: number,
    userId: number,
    data: AgentChatDto
  ): Promise<any> {
    const { sessionId } = data;

    // Validate session if provided
    if (sessionId) {
      await this.getSessionById(Number(sessionId), userId, agentId);
    }

    // Delegate to processor service
    return await this.chatProcessorService.handleAgentChat(
      agentId,
      userId,
      data,
      sessionId ? Number(sessionId) : undefined
    );
  }

  /**
   * Handle chat messages and generate a response using the AI model (Legacy method)
   */
  public async handleChat(data: {
    messages: any[];
    model?: string;
    userId?: number;
  }): Promise<any> {
    try {
      const { messages, model: selectedModel } = data;

      if (!messages || !Array.isArray(messages)) {
        throw new HttpException(400, "Invalid messages format");
      }

      const modelToUse = (selectedModel as modelID) || defaultModel;

      // Check if the requested model is available (global API key must be set)
      if (!languageModels[modelToUse]) {
        throw new HttpException(
          400,
          `Model '${modelToUse}' not available. Please set GROQ_API_KEY environment variable or use agent-based chat.`
        );
      }

      // Pass messages as-is to CoreMessage[]
      const result = await streamText({
        model: languageModels[modelToUse],
        messages: messages as CoreMessage[],
        system: chatConfig.prompts.directModelFallbackPrompt,
      });

      let fullResponse = "";
      for await (const delta of result.textStream) {
        fullResponse += delta;
      }

      return {
        message: fullResponse,
        model: modelToUse,
      };
    } catch (error: any) {
      if (error instanceof Error && error.message.includes("Rate limit")) {
        throw new HttpException(
          429,
          chatConfig.aiProcessing.generalRateLimitMessage
        );
      }

      if (error instanceof HttpException) throw error;
      throw new HttpException(
        500,
        `An error occurred processing the chat: ${error.message}`
      );
    }
  }
}

export default ChatOrchestratorService;