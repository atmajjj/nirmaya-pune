import knex from "../../../../database/index.schema";
import HttpException from "../../../exceptions/HttpException";
import { SmartCacheService } from "../../../utils/smart-cache.service";
import {
  IChatSession,
  IChatMessage,
} from "../chat.interface";

class ChatSessionService {
  private cache: SmartCacheService;

  constructor() {
    this.cache = new SmartCacheService("session_messages");
  }

  /**
   * Generate cache key for session messages
   */
  private getMessagesKey(sessionId: number, userId: number): string {
    return `messages_${userId}_${sessionId}`;
  }

  /**
   * Get cached session messages
   */
  private async getCachedMessages(
    sessionId: number,
    userId: number
  ): Promise<IChatMessage[] | null> {
    const key = this.getMessagesKey(sessionId, userId);
    return await this.cache.get<IChatMessage[]>(key);
  }

  /**
   * Cache session messages
   */
  private async setCachedMessages(
    sessionId: number,
    userId: number,
    messages: IChatMessage[]
  ): Promise<void> {
    const key = this.getMessagesKey(sessionId, userId);
    await this.cache.set(key, messages);
  }

  /**
   * Get messages or execute callback if cache miss
   */
  private async getOrFetchMessages(
    sessionId: number,
    userId: number,
    fetchCallback: () => Promise<IChatMessage[]>
  ): Promise<IChatMessage[]> {
    const key = this.getMessagesKey(sessionId, userId);
    return await this.cache.getOrSet(key, fetchCallback);
  }

  /**
   * Invalidate session cache
   */
  private async invalidateSessionCache(
    sessionId: number,
    userId: number
  ): Promise<void> {
    const messagesKey = this.getMessagesKey(sessionId, userId);
    await this.cache.delete(messagesKey);
  }
  /**
   * Create a new chat session
   */
  public async createChatSession(
    agentId: number,
    userId: number
  ): Promise<IChatSession> {
    try {
      const [session] = await knex("chat_sessions")
        .insert({
          agent_id: agentId,
          user_id: userId,
          created_at: new Date(),
        })
        .returning("*");

      return session;
    } catch (error) {
      throw new HttpException(
        500,
        `Error creating chat session: ${error.message}`
      );
    }
  }

  /**
   * Get existing session or create new one
   */
  public async getOrCreateSession(
    agentId: number,
    userId: number,
    sessionId?: number
  ): Promise<IChatSession> {
    try {
      if (sessionId) {
        const existingSession = await knex("chat_sessions")
          .where({
            id: sessionId,
            agent_id: agentId,
            user_id: userId,
          })
          .first();

        if (existingSession) {
          return existingSession;
        }
      }

      // Create new session if none exists or specified session not found
      return await this.createChatSession(agentId, userId);
    } catch (error) {
      throw new HttpException(
        500,
        `Error managing chat session: ${error.message}`
      );
    }
  }

  /**
   * Get all sessions for a user and agent
   */
  public async getUserAgentSessions(
    userId: number,
    agentId?: number
  ): Promise<IChatSession[]> {
    try {
      const query = knex("chat_sessions")
        .where({ user_id: userId })
        .orderBy("created_at", "desc");

      if (agentId) {
        query.where({ agent_id: agentId });
      }

      return await query;
    } catch (error) {
      throw new HttpException(
        500,
        `Error fetching chat sessions: ${error.message}`
      );
    }
  }

  /**
   * Save a message to session
   */
  public async saveMessage(
    sessionId: number,
    content: string,
    role: "user" | "assistant",
    userId?: number
  ): Promise<IChatMessage> {
    try {
      const [message] = await knex("messages")
        .insert({
          session_id: sessionId,
          content,
          role,
          created_at: new Date(),
        })
        .returning("*");

      // Invalidate cache after saving message
      await this.invalidateSessionCache(sessionId, userId);

      return message;
    } catch (error) {
      throw new HttpException(500, `Error saving message: ${error.message}`);
    }
  }

  /**
   * Get messages for a session (with caching)
   */
  public async getSessionMessages(
    sessionId: number,
    userId: number
  ): Promise<IChatMessage[]> {
    try {
      // Use cache with getOrFetch pattern
      return await this.getOrFetchMessages(
        sessionId,
        userId,
        async () => {
          // Verify session belongs to user
          const session = await knex("chat_sessions")
            .where({ id: sessionId, user_id: userId })
            .first();

          if (!session) {
            throw new HttpException(404, "Session not found or not accessible");
          }

          const messages = await knex("messages")
            .where({ session_id: sessionId })
            .orderBy("created_at", "asc");

          return messages;
        }
      );
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        500,
        `Error fetching session messages: ${error.message}`
      );
    }
  }

  /**
   * Delete a chat session and its messages
   */
  public async deleteChatSession(
    sessionId: number,
    userId: number
  ): Promise<void> {
    try {
      // Verify session belongs to user
      const session = await knex("chat_sessions")
        .where({ id: sessionId, user_id: userId })
        .first();

      if (!session) {
        throw new HttpException(404, "Session not found or not accessible");
      }

      // Delete messages first (due to foreign key constraint)
      await knex("messages").where({ session_id: sessionId }).del();

      // Delete session
      await knex("chat_sessions").where({ id: sessionId }).del();
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        500,
        `Error deleting chat session: ${error.message}`
      );
    }
  }
}

export default ChatSessionService;
