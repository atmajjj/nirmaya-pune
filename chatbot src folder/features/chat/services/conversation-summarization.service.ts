import { SmartCacheService } from "../../../utils/smart-cache.service";
import { logger } from "../../../utils/logger";
import { IChatMessage } from "../chat.interface";
import { CoreMessage } from "ai";
import { chatConfig } from '../../../config/chat.config';

/**
 * Conversation Summarization Service
 * Intelligently summarizes long conversation histories to reduce token usage
 * Uses rolling window summarization with semantic chunking
 */
class ConversationSummarizationService {
  private cache: SmartCacheService;

  constructor() {
    const namespace = (chatConfig.summarization.cacheNamespace || "conversation_summary") as any;
    this.cache = new SmartCacheService(namespace);
  }

  /**
   * Generate cache key for conversation summary
   */
  private getSummaryKey(sessionId: number, messageCount: number): string {
    return `${sessionId}_${messageCount}`;
  }

  /**
   * Check if conversation needs summarization
   */
  private shouldSummarize(messageCount: number): boolean {
    return messageCount > chatConfig.summarization.messageCountThreshold;
  }

  /**
   * Extract key topics and themes from conversation
   */
  private extractTopics(messages: IChatMessage[]): string[] {
    const topics = new Set<string>();
    const content = messages.map(m => m.content).join(' ').toLowerCase();

    // Common topic indicators
    const topicPatterns = chatConfig.summarization.topicPatterns;

    topicPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const topic = match[2]?.trim();
        if (topic && topic.length > chatConfig.summarization.minTopicLength && topic.length < chatConfig.summarization.maxTopicLength) {
          topics.add(topic);
        }
      }
    });

    return Array.from(topics).slice(0, chatConfig.summarization.maxTopics);
  }

  /**
   * Create intelligent summary using rolling window approach
   */
  private createIntelligentSummary(messages: IChatMessage[]): string {
    const topics = this.extractTopics(messages);
    const recentMessages = messages.slice(-chatConfig.summarization.rollingWindowSize); // Last N messages for better context

    // Group messages into logical conversation chunks
    const chunks: string[] = [];
    let currentChunk: IChatMessage[] = [];
    let currentSpeaker = '';

    for (const message of recentMessages) {
      if (message.role !== currentSpeaker && currentChunk.length > 0) {
        // Speaker changed, process previous chunk
        chunks.push(this.summarizeChunk(currentChunk));
        currentChunk = [];
      }
      currentChunk.push(message);
      currentSpeaker = message.role;
    }

    // Process final chunk
    if (currentChunk.length > 0) {
      chunks.push(this.summarizeChunk(currentChunk));
    }

    // Combine chunks with topics
    let summary = '';

    if (topics.length > 0) {
      summary += `Topics discussed: ${topics.join(', ')}.\n\n`;
    }

    summary += `Conversation flow:\n${chunks.join('\n')}`;

    return summary;
  }

  /**
   * Summarize a chunk of related messages
   */
  private summarizeChunk(chunk: IChatMessage[]): string {
    if (chunk.length === 0) return '';

    const firstMessage = chunk[0];
    const lastMessage = chunk[chunk.length - 1];

    if (chunk.length === 1) {
      // Single message
      const role = firstMessage.role === 'user' ? 'User' : 'Assistant';
      const content = firstMessage.content.length > chatConfig.summarization.contentPreviewLength
        ? firstMessage.content.substring(0, chatConfig.summarization.contentPreviewLength) + '...'
        : firstMessage.content;
      return `${role}: ${content}`;
    }

    if (chunk.length === 2 && firstMessage.role === 'user' && lastMessage.role === 'assistant') {
      // User question + AI response
      const question = firstMessage.content.length > chatConfig.summarization.questionPreviewLength
        ? firstMessage.content.substring(0, chatConfig.summarization.questionPreviewLength) + '...'
        : firstMessage.content;
      const answer = lastMessage.content.length > chatConfig.summarization.answerPreviewLength
        ? lastMessage.content.substring(0, chatConfig.summarization.answerPreviewLength) + '...'
        : lastMessage.content;
      return `Q: ${question}\nA: ${answer}`;
    }

    // Multiple messages from same speaker
    const role = firstMessage.role === 'user' ? 'User' : 'Assistant';
    const totalLength = chunk.reduce((sum, msg) => sum + msg.content.length, 0);
    const avgLength = Math.round(totalLength / chunk.length);

    return `${role}: ${chunk.length} messages (avg ${avgLength} chars each)`;
  }

  /**
   * Get summarized conversation history
   */
  public async getSummarizedHistory(
    sessionId: number,
    messages: IChatMessage[]
  ): Promise<CoreMessage[]> {
    const messageCount = messages.length;

    // If conversation is short, return as-is
    if (!this.shouldSummarize(messageCount)) {
      return messages.map(msg => ({
        role: msg.role,
        content: msg.content,
      }));
    }

    const cacheKey = this.getSummaryKey(sessionId, messageCount);

    // Try cache first
    const cachedSummary = await this.cache.get<string>(cacheKey);
    if (cachedSummary) {
      logger.debug(`📝 Using cached conversation summary for session ${sessionId}`);

      // Return last N messages + summary
      const recentMessages = messages.slice(-chatConfig.summarization.recentMessagesCount).map(msg => ({
        role: msg.role,
        content: msg.content,
      }));

      return [
        {
          role: "system",
          content: `Previous conversation summary:\n${cachedSummary}`,
        } as CoreMessage,
        ...recentMessages,
      ];
    }

    // Generate new summary using intelligent summarization
    logger.debug(`📝 Generating intelligent conversation summary for session ${sessionId} (${messageCount} messages)`);
    const summary = this.createIntelligentSummary(messages);

    // Cache the summary
    await this.cache.set(cacheKey, summary);

    // Return last N messages + summary
    const recentMessages = messages.slice(-chatConfig.summarization.recentMessagesCount).map(msg => ({
      role: msg.role,
      content: msg.content,
    }));

    return [
      {
        role: "system",
        content: `Previous conversation summary:\n${summary}`,
      } as CoreMessage,
      ...recentMessages,
    ];
  }
}

// Export singleton instance
const conversationSummarizationService = new ConversationSummarizationService();
export default conversationSummarizationService;