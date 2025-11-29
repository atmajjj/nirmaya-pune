import { AgentChatDto } from "../chat.dto";
import ChatOrchestratorService from "./chat-orchestrator.service";

/**
 * Main Chat Service - Facade for chat operations
 * Delegates to ChatOrchestratorService for all functionality
 *
 * This service maintains backward compatibility while the actual
 * implementation has been split into specialized services:
 * - ChatOrchestratorService: Session management and high-level coordination
 * - ChatProcessorService: Complex chat processing logic
 */
class ChatService {
  private chatOrchestratorService = new ChatOrchestratorService();

  /**
   * Create a new session with agent validation
   */
  public async createNewSession(agentId: number, userId: number) {
    return await this.chatOrchestratorService.createNewSession(agentId, userId);
  }

  /**
   * Get chat history for a session
   */
  public async getChatHistory(sessionId: number, userId: number) {
    return await this.chatOrchestratorService.getChatHistory(sessionId, userId);
  }

  /**
   * Get user's chat sessions with summary
   */
  public async getUserChatSessions(userId: number, agentId?: number) {
    return await this.chatOrchestratorService.getUserChatSessions(userId, agentId);
  }

  /**
   * Handle agent-based chat with session management
   */
  public async handleAgentChat(
    agentId: number,
    userId: number,
    data: AgentChatDto
  ): Promise<any> {
    return await this.chatOrchestratorService.handleAgentChat(agentId, userId, data);
  }

  /**
   * Handle chat messages and generate a response using the AI model (Legacy method)
   */
  public async handleChat(data: {
    messages: any[];
    model?: string;
    userId?: number;
  }): Promise<any> {
    return await this.chatOrchestratorService.handleChat(data);
  }
}

export default ChatService;