/**
 * Chatbot Config Unit Tests
 *
 * Tests for chatbot configuration values and structure.
 */

import { chatbotConfig } from '../../config/chatbot.config';

describe('Chatbot Configuration', () => {
  describe('general settings', () => {
    it('should have namespace defined', () => {
      expect(chatbotConfig.general.namespace).toBe('nira-global');
    });

    it('should have maxFileSize as 20MB', () => {
      expect(chatbotConfig.general.maxFileSize).toBe(20 * 1024 * 1024);
    });

    it('should have allowed MIME types', () => {
      const allowedTypes = chatbotConfig.general.allowedMimeTypes;

      expect(allowedTypes).toContain('application/pdf');
      expect(allowedTypes).toContain('text/plain');
      expect(allowedTypes).toContain('text/markdown');
      expect(allowedTypes).toContain('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    });

    it('should have allowed extensions', () => {
      const extensions = chatbotConfig.general.allowedExtensions;

      expect(extensions).toContain('.pdf');
      expect(extensions).toContain('.txt');
      expect(extensions).toContain('.md');
      expect(extensions).toContain('.docx');
    });

    it('should have matching MIME types and extensions count', () => {
      expect(chatbotConfig.general.allowedMimeTypes.length).toBe(
        chatbotConfig.general.allowedExtensions.length
      );
    });
  });

  describe('chunking configuration', () => {
    it('should have minChunkSize less than maxChunkSize', () => {
      expect(chatbotConfig.chunking.minChunkSize).toBeLessThan(
        chatbotConfig.chunking.maxChunkSize
      );
    });

    it('should have targetChunkSize between min and max', () => {
      expect(chatbotConfig.chunking.targetChunkSize).toBeGreaterThanOrEqual(
        chatbotConfig.chunking.minChunkSize
      );
      expect(chatbotConfig.chunking.targetChunkSize).toBeLessThanOrEqual(
        chatbotConfig.chunking.maxChunkSize
      );
    });

    it('should have valid overlap percentage (0-100)', () => {
      expect(chatbotConfig.chunking.overlapPercentage).toBeGreaterThanOrEqual(0);
      expect(chatbotConfig.chunking.overlapPercentage).toBeLessThanOrEqual(100);
    });

    it('should have sentence end markers defined', () => {
      expect(chatbotConfig.chunking.sentenceEndMarkers).toBeDefined();
      expect(chatbotConfig.chunking.sentenceEndMarkers.length).toBeGreaterThan(0);
      expect(chatbotConfig.chunking.sentenceEndMarkers).toContain('.');
    });
  });

  describe('embedding configuration', () => {
    it('should have BGE-M3 model', () => {
      expect(chatbotConfig.embedding.modelName).toBe('BAAI/bge-m3');
    });

    it('should have 1024 dimensions', () => {
      expect(chatbotConfig.embedding.dimensions).toBe(1024);
    });

    it('should have valid batch size', () => {
      expect(chatbotConfig.embedding.maxBatchSize).toBeGreaterThan(0);
      expect(chatbotConfig.embedding.maxBatchSize).toBeLessThanOrEqual(100);
    });

    it('should have valid max text length', () => {
      expect(chatbotConfig.embedding.maxTextLength).toBeGreaterThan(0);
    });

    it('should have retry configuration', () => {
      expect(chatbotConfig.embedding.retryAttempts).toBeGreaterThan(0);
      expect(chatbotConfig.embedding.retryDelay).toBeGreaterThan(0);
    });
  });

  describe('search configuration', () => {
    it('should have valid topK settings', () => {
      expect(chatbotConfig.search.defaultTopK).toBeGreaterThan(0);
      expect(chatbotConfig.search.maxTopK).toBeGreaterThanOrEqual(
        chatbotConfig.search.defaultTopK
      );
    });

    it('should have valid similarity threshold (0-1)', () => {
      expect(chatbotConfig.search.minSimilarityThreshold).toBeGreaterThanOrEqual(0);
      expect(chatbotConfig.search.minSimilarityThreshold).toBeLessThanOrEqual(1);
    });

    it('should have dense and sparse weights that sum to 1', () => {
      const sum = chatbotConfig.search.denseWeight + chatbotConfig.search.sparseWeight;
      expect(sum).toBeCloseTo(1, 5);
    });
  });

  describe('LLM configuration', () => {
    it('should use Groq provider', () => {
      expect(chatbotConfig.llm.provider).toBe('groq');
    });

    it('should have default model', () => {
      expect(chatbotConfig.llm.defaultModel).toBeDefined();
      expect(chatbotConfig.llm.defaultModel.length).toBeGreaterThan(0);
    });

    it('should have available models array', () => {
      expect(chatbotConfig.llm.availableModels).toBeDefined();
      expect(Array.isArray(chatbotConfig.llm.availableModels)).toBe(true);
      expect(chatbotConfig.llm.availableModels.length).toBeGreaterThan(0);
    });

    it('should include default model in available models', () => {
      expect(chatbotConfig.llm.availableModels).toContain(
        chatbotConfig.llm.defaultModel
      );
    });

    it('should have valid max tokens', () => {
      expect(chatbotConfig.llm.maxTokens).toBeGreaterThan(0);
    });

    it('should have valid temperature (0-2)', () => {
      expect(chatbotConfig.llm.temperature).toBeGreaterThanOrEqual(0);
      expect(chatbotConfig.llm.temperature).toBeLessThanOrEqual(2);
    });
  });

  describe('chat configuration', () => {
    it('should have max context messages', () => {
      expect(chatbotConfig.chat.maxContextMessages).toBeGreaterThan(0);
    });

    it('should have max context chars', () => {
      expect(chatbotConfig.chat.maxContextChars).toBeGreaterThan(0);
    });

    it('should have session title max length', () => {
      expect(chatbotConfig.chat.sessionTitleMaxLength).toBeGreaterThan(0);
    });
  });

  describe('rate limit configuration', () => {
    it('should have chat rate limits', () => {
      expect(chatbotConfig.rateLimit.chat).toBeDefined();
      expect(chatbotConfig.rateLimit.chat.windowMs).toBeGreaterThan(0);
      expect(chatbotConfig.rateLimit.chat.max).toBeGreaterThan(0);
    });

    it('should have upload rate limits', () => {
      expect(chatbotConfig.rateLimit.upload).toBeDefined();
      expect(chatbotConfig.rateLimit.upload.windowMs).toBeGreaterThan(0);
      expect(chatbotConfig.rateLimit.upload.max).toBeGreaterThan(0);
    });

    it('should have general rate limits', () => {
      expect(chatbotConfig.rateLimit.general).toBeDefined();
      expect(chatbotConfig.rateLimit.general.windowMs).toBeGreaterThan(0);
      expect(chatbotConfig.rateLimit.general.max).toBeGreaterThan(0);
    });

    it('should have stricter upload rate limits than chat', () => {
      // Upload should allow fewer requests
      expect(chatbotConfig.rateLimit.upload.max).toBeLessThanOrEqual(
        chatbotConfig.rateLimit.chat.max
      );
    });
  });
});
