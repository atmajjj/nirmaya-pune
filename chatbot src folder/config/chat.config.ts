/**
 * Chat Feature Configuration
 *
 * Centralized configuration for all chat-related services and operations.
 * This file consolidates all hardcoded values for easy editing and testing.
 */

import { ChatConfig } from '../interfaces/config.interface';
import { cacheConfig } from './feature-cache.config';
import { searchConfig } from './search.config';

/**
 * Default Chat Configuration
 * Production-ready settings optimized for ChatVerse
 */
export const defaultChatConfig: ChatConfig = {
  // ========================
  // SYSTEM PROMPTS
  // ========================
  prompts: {
    // Default prompts
    defaultBasePrompt: "You are a helpful AI assistant for this organization.",
    fallbackSystemPrompt: "You are a helpful AI assistant. Provide accurate, informative responses while being concise and clear.",
    directModelFallbackPrompt: "You are a helpful assistant.",
    noSourcesPrompt: "You are a helpful AI assistant.\n\nIMPORTANT: No knowledge sources have been uploaded yet.\n\nYour responses should:\n1. Acknowledge that no specific content has been provided\n2. Explain that you can help once they upload relevant documents\n3. Suggest what types of content would be helpful\n4. Be encouraging about the upload process\n\nExample responses:\n- \"I don't have any specific content to help you with yet. Once you upload relevant documents, I'll be able to provide detailed answers about your materials.\"\n- \"To give you the best help, please upload documents related to your questions. I can work with PDFs, text files, and other document formats.\"\n\nKeep responses brief and helpful.",

    // Source-first behavior settings
    enableSourceFirstBehavior: true,
    citationFormat: "[source_ID]", // Format for source citations
    availableTopicsMax: 8,

    // Prompt validation settings
    minPromptLength: 200,
    requireContextMention: true,
    requireGreetingExceptions: true,
  },

  // ========================
  // SOURCE GUARD CONFIGURATIONS
  // ========================
  sourceGuard: {
    // Pattern configurations
    greetingPatterns: [/^(hi|hello|hey|good morning|good afternoon|good evening|how are you|what's up|what is up|thanks?|thank you|thx|bye|goodbye|see you|take care|please|sorry|excuse me)/i],
    conversationalPatterns: [/^(can you help|could you help|i need help|what can you do|what are your capabilities|how do i use|how to use)/i],
    generalKnowledgePatterns: [
      /tell me a joke/i,
      /what is (the|a) weather/i,
      /(current events|news|latest)/i,
      /what is (the capital|population) of/i,
      /who is (the president|prime minister)/i,
      /what happened (today|yesterday|in)/i,
      /explain (physics|chemistry|biology|math)/i,
      /calculate|solve this/i,
      /what time is it/i,
      /what day is it/i,
    ],

    // Response templates
    generalKnowledgeDeclineMessage: "I'm designed to help with information from your uploaded sources. I can't provide general information like jokes, weather, or current events. Is there something specific about your content I can help you with instead?",

    // Logging settings
    enableDecisionLogging: true,
  },

  // ========================
  // CONTEXT RETRIEVAL CONFIGURATIONS (Now in global search config)
  // ========================
  // Search and context settings moved to src/config/search.config.ts
  // Access via: searchConfig.layers.chat.context, searchConfig.layers.chat.vectorSearch

  // ========================
  // CONVERSATION SUMMARIZATION
  // ========================
  summarization: {
    // Thresholds
    messageCountThreshold: 8, // When to start summarization
    rollingWindowSize: 12, // Messages to keep in recent context
    maxTopics: 5, // Maximum topics to extract

    // Topic extraction patterns
    topicPatterns: [
      /\b(about|regarding|concerning)\s+([^.!?]+)[\.!?]/g,
      /\b(discussing|talking about|explaining)\s+([^.!?]+)[\.!?]/g,
      /\b(what is|how to|explain)\s+([^.!?]+)[\.!?]/g,
      /\b(tell me about|information on)\s+([^.!?]+)[\.!?]/g,
    ],

    // Content limits
    minTopicLength: 3,
    maxTopicLength: 50,

    // Preview lengths for summarization
    contentPreviewLength: 80,
    questionPreviewLength: 60,
    answerPreviewLength: 100,

    // Recent messages to keep in context
    recentMessagesCount: 3,
    cacheNamespace: "conversation_summary",
  },

  // ========================
  // RESPONSE CACHE CONFIGURATIONS (Now in global cache config)
  // ========================
  // Cache settings moved to src/config/cache.config.ts
  // Access via: cacheConfig.chat.responseCache

  // ========================
  // AI PROCESSING CONFIGURATIONS
  // ========================
  aiProcessing: {
    // Temperature validation
    defaultTemperature: 0.65, // Optimized from 0.7 for faster responses with maintained quality
    minTemperature: 0,
    maxTemperature: 2,

    // Token limits
    defaultMaxTokens: 400, // Optimized from 500 for faster AI responses

    // API key validation patterns
    apiKeyPatterns: {
      openai: /^sk-/,
      anthropic: /^sk-ant-/,
      groq: /^gsk_/,
      google: /^AIza[0-9A-Za-z-_]{35}/, // Google API key pattern
    },

    // Error messages
    invalidApiKeyMessages: {
      openai: "Invalid API key format. Please check your OpenAI API key.",
      anthropic: "Invalid API key format. Please check your Anthropic API key.",
      groq: "Invalid API key format. Please check your Groq API key.",
      google: "Invalid API key format. Please check your Google API key.",
    },

    rateLimitMessage: "API rate limit exceeded. Please try again later.",

    // General error messages
    generalRateLimitMessage: "Rate limit exceeded. Please try again later.",
    emptyResponseMessage: "No response generated. This may be due to API key issues, content filtering, or model limitations. Please check your configuration.",
  },

  // ========================
  // ANALYTICS CONFIGURATIONS (Now in global cache config)
  // ========================
  // Analytics settings moved to src/config/cache.config.ts
  // Access via: cacheConfig.chat.analytics
};

/**
 * Environment-specific configuration overrides
 */
export const getChatConfig = (): ChatConfig => {
  const config = { ...defaultChatConfig };

  // Environment-specific overrides can be added here
  if (process.env.NODE_ENV === 'development') {
    // Development-specific settings
    config.sourceGuard.enableDecisionLogging = true;
  }

  if (process.env.NODE_ENV === 'test') {
    // Test-specific settings - cache settings now handled by global cache config
  }

  return config;
};

/**
 * Export the active configuration
 */
export const chatConfig = getChatConfig();