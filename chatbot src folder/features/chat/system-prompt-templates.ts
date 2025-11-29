/**
 * System Prompt Templates
 * Provides a single, general system prompt for AI agents
 */

import { chatConfig } from '../../config/chat.config';

export class SystemPromptTemplates {

  /**
   * Generate the standard system prompt for all agents
   * This is the only prompt template used - simple, general, and effective
   */
  public static generateSystemPrompt(basePrompt?: string): string {
    const defaultBase = basePrompt || chatConfig.prompts.defaultBasePrompt;

    return `${defaultBase}

You are a helpful AI assistant. Use information from your knowledge base to answer questions.

**CRITICAL INSTRUCTIONS:**
- ALWAYS look through ALL the provided context for relevant information
- If you find ANY information related to the question, use it in your answer
- Do NOT say "I don't have information" unless there's literally nothing in the context
- Be comprehensive - include all relevant details, lists, and facts you find
- Answer questions based on what's available in the context

**RESPONSE RULES:**
- Use partial information rather than giving no answer
- Include all partnerships, competitors, and lists you find
- Be direct and helpful
- Never refuse to answer when context is provided`;
  }

  /**
   * Get fallback prompt when no sources are available
   */
  public static generateNoSourcesPrompt(basePrompt?: string): string {
    const defaultBase = "You are a helpful AI assistant.";
    const systemBase = basePrompt || defaultBase;

    return `${systemBase}

I don't have any specific content uploaded yet. Please upload documents so I can help you with detailed answers about your materials.`;
  }
}

export default SystemPromptTemplates;