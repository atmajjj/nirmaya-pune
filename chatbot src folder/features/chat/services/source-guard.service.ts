import { logger } from "../../../utils/logger";
import { chatConfig } from '../../../config/chat.config';

/**
 * Source Guard Service
 * Manages source-first behavior for chatbot responses
 * Implements intent classification and fallback handling
 */
class SourceGuardService {
  /**
   * Pre-compiled regex patterns for better performance
   */
  private static readonly GREETING_PATTERNS = new RegExp(chatConfig.sourceGuard.greetingPatterns.join('|'), 'i');

  private static readonly CONVERSATIONAL_PATTERNS = new RegExp(chatConfig.sourceGuard.conversationalPatterns.join('|'), 'i');

  private static readonly GENERAL_KNOWLEDGE_PATTERNS = chatConfig.sourceGuard.generalKnowledgePatterns.map(pattern => new RegExp(pattern, 'i'));

  constructor() {
    logger.info("🛡️ SourceGuardService initialized");
  }

  /**
   * Check if the query should be allowed without source content
   */
  public isAllowedWithoutSources(query: string): boolean {
    const normalizedQuery = query.trim().toLowerCase();

    return SourceGuardService.GREETING_PATTERNS.test(normalizedQuery) ||
           SourceGuardService.CONVERSATIONAL_PATTERNS.test(normalizedQuery);
  }

  /**
   * Check if the query is clearly asking for general knowledge
   */
  public isGeneralKnowledgeQuery(query: string): boolean {
    const normalizedQuery = query.trim().toLowerCase();
    return SourceGuardService.GENERAL_KNOWLEDGE_PATTERNS.some(pattern => pattern.test(normalizedQuery));
  }

  /**
   * Generate polite decline for general knowledge queries
   */
  public generateGeneralKnowledgeDecline(): string {
    return chatConfig.sourceGuard.generalKnowledgeDeclineMessage;
  }

  /**
   * Log source-first behavior decisions for monitoring
   */
  public logSourceFirstDecision(
    query: string,
    hasContext: boolean,
    isGreeting: boolean,
    isGeneralKnowledge: boolean,
    userId: number,
    agentId: number
  ): void {
    if (!chatConfig.sourceGuard.enableDecisionLogging) {
      return;
    }
    const decision = this.getDecisionType(hasContext, isGreeting, isGeneralKnowledge);
    
    logger.info("🛡️ Source-first decision", {
      query: query.substring(0, 100),
      hasContext,
      isGreeting,
      isGeneralKnowledge,
      userId,
      agentId,
      decision
    });
  }

  /**
   * Categorize the type of decision made
   */
  private getDecisionType(hasContext: boolean, isGreeting: boolean, isGeneralKnowledge: boolean): string {
    if (isGreeting) return "ALLOWED_GREETING";
    if (isGeneralKnowledge) return "BLOCKED_GENERAL_KNOWLEDGE";
    if (hasContext) return "ANSWERED_FROM_SOURCES";
    return "NO_SOURCE_FALLBACK";
  }
}

export default SourceGuardService;