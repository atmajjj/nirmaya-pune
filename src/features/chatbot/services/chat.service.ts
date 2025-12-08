/**
 * Chat Service
 *
 * Handles chat interactions with the Groq LLM:
 * - System prompt generation
 * - Context injection
 * - Response generation
 */

import { createGroq } from '@ai-sdk/groq';
import { generateText } from 'ai';
import { logger } from '../../../utils/logger';
import HttpException from '../../../utils/httpException';
import { config } from '../../../utils/validateEnv';
import { chatbotConfig } from '../config/chatbot.config';
import { searchDocuments, buildContextFromResults, extractSourceReferences, hasDocuments } from './search.service';
import { MessageSource } from '../shared/interface';

const { llm: llmConfig, chat: chatConfig } = chatbotConfig;

// Initialize Groq client
const groq = createGroq({
  apiKey: config.GROQ_API_KEY,
});

/**
 * Generate a chat response based on user message and context
 * @param userMessage - User's message
 * @param conversationHistory - Previous messages for context
 * @returns Chat response with sources
 */
export async function generateChatResponse(
  userMessage: string,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = []
): Promise<{ message: string; sources: MessageSource[] }> {
  try {
    logger.info(`💬 Processing chat message: "${userMessage.substring(0, 50)}..."`);

    // Check if any documents exist
    const documentsExist = await hasDocuments();
    
    if (!documentsExist) {
      return {
        message: "I don't have any documents to reference yet. Please ask an administrator to upload some documents first, and then I'll be able to help answer your questions based on that content.",
        sources: [],
      };
    }

    // Search for relevant context
    const searchResults = await searchDocuments(userMessage, chatConfig.maxContextMessages);

    // Build context from search results
    const context = buildContextFromResults(searchResults);

    // Extract source references
    const sources = extractSourceReferences(searchResults);

    // Generate system prompt with context
    const systemPrompt = buildSystemPrompt(context);

    // Build messages array for LLM
    const messages = buildMessagesArray(systemPrompt, conversationHistory, userMessage);

    // Call Groq LLM
    const response = await generateText({
      model: groq(llmConfig.defaultModel),
      messages,
      maxTokens: llmConfig.maxTokens,
      temperature: llmConfig.temperature,
    } as Parameters<typeof generateText>[0]);

    const assistantMessage = response.text;

    logger.info(`✅ Generated response (${assistantMessage.length} chars)`);

    return {
      message: assistantMessage,
      sources,
    };
  } catch (error) {
    logger.error('❌ Chat response generation failed:', error);
    
    if (error instanceof HttpException) throw error;
    
    throw new HttpException(
      500,
      `Chat failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Build system prompt with context
 */
function buildSystemPrompt(context: string): string {
  if (!context || context.trim().length === 0) {
    return `You are NIRA AI, a helpful assistant for the Nirmaya platform. 

I couldn't find any relevant information in the uploaded documents for this query. 

Please let the user know that:
1. Their question may not be covered in the available documents
2. They can try rephrasing their question
3. An administrator may need to upload more relevant documents

Be helpful and professional in your response.`;
  }

  return chatbotConfig.systemPrompt.replace('{context}', context);
}

/**
 * Build messages array for LLM
 */
function buildMessagesArray(
  systemPrompt: string,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
  userMessage: string
): Array<{ role: 'system' | 'user' | 'assistant'; content: string }> {
  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: systemPrompt },
  ];

  // Add recent conversation history (last N messages)
  const recentHistory = conversationHistory.slice(-chatConfig.maxContextMessages * 2);
  
  for (const msg of recentHistory) {
    messages.push({
      role: msg.role,
      content: msg.content,
    });
  }

  // Add current user message
  messages.push({
    role: 'user',
    content: userMessage,
  });

  return messages;
}

/**
 * Generate a title for a chat session based on the first message
 */
export async function generateSessionTitle(firstMessage: string): Promise<string> {
  try {
    // Simple approach: take first few words
    const words = firstMessage.split(/\s+/).slice(0, 6);
    let title = words.join(' ');

    if (title.length > chatConfig.sessionTitleMaxLength) {
      title = title.substring(0, chatConfig.sessionTitleMaxLength - 3) + '...';
    }

    return title || 'New Chat';
  } catch (error) {
    logger.error('Error generating session title:', error);
    return 'New Chat';
  }
}

/**
 * Get available LLM models
 */
export function getAvailableModels(): string[] {
  return llmConfig.availableModels;
}
