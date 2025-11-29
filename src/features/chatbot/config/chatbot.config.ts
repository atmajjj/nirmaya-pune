/**
 * NIRA AI Chatbot Configuration
 *
 * Centralized configuration for all chatbot-related services and operations.
 */

export const chatbotConfig = {
  // ========================
  // GENERAL SETTINGS
  // ========================
  general: {
    namespace: 'nira-global', // Single global namespace for all documents
    maxFileSize: 20 * 1024 * 1024, // 20MB in bytes
    allowedMimeTypes: [
      'application/pdf',
      'text/plain',
      'text/markdown',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
    allowedExtensions: ['.pdf', '.txt', '.md', '.docx'],
  },

  // ========================
  // CHUNKING CONFIGURATION
  // ========================
  chunking: {
    minChunkSize: 400,
    maxChunkSize: 1200,
    targetChunkSize: 800,
    overlapPercentage: 25,
    // Sentence boundary detection
    sentenceEndMarkers: ['.', '!', '?', '\n\n'],
  },

  // ========================
  // EMBEDDING CONFIGURATION
  // ========================
  embedding: {
    modelName: 'BAAI/bge-m3',
    dimensions: 1024,
    maxBatchSize: 15,
    maxTextLength: 8192,
    retryAttempts: 3,
    retryDelay: 1000, // ms
  },

  // ========================
  // SEARCH CONFIGURATION
  // ========================
  search: {
    defaultTopK: 5,
    maxTopK: 20,
    minSimilarityThreshold: 0.3,
    // Hybrid search weights
    denseWeight: 0.7,
    sparseWeight: 0.3,
  },

  // ========================
  // LLM CONFIGURATION
  // ========================
  llm: {
    provider: 'groq',
    defaultModel: 'llama-3.3-70b-versatile',
    availableModels: [
      'llama-3.3-70b-versatile',
      'llama-3.1-8b-instant',
      'mixtral-8x7b-32768',
    ],
    maxTokens: 2048,
    temperature: 0.7,
  },

  // ========================
  // CHAT CONFIGURATION
  // ========================
  chat: {
    maxContextMessages: 5, // Last N messages to include
    maxContextChars: 4000, // Max characters for document context
    sessionTitleMaxLength: 100,
  },

  // ========================
  // RATE LIMITING
  // ========================
  rateLimit: {
    chat: {
      windowMs: 60 * 1000, // 1 minute
      max: 30, // 30 requests per minute
    },
    upload: {
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 10, // 10 uploads per hour
    },
    general: {
      windowMs: 60 * 1000, // 1 minute
      max: 60, // 60 requests per minute
    },
  },

  // ========================
  // SYSTEM PROMPT
  // ========================
  systemPrompt: `You are NIRA AI, a helpful assistant for the Nirmaya platform. Your purpose is to answer questions based on the provided context from uploaded documents.

Guidelines:
1. Only answer questions based on the provided context
2. If the context doesn't contain relevant information, politely say so
3. Be concise but thorough in your responses
4. Cite which document(s) your answer is based on when possible
5. If asked about topics outside the documents, explain that you can only answer questions about the uploaded content
6. Be professional and helpful

Context from documents:
{context}

Remember: Only use information from the provided context above.`,
};

// Export individual configs for convenience
export const { general, chunking, embedding, search, llm, chat, rateLimit, systemPrompt } =
  chatbotConfig;

export default chatbotConfig;
