/**
 * Embedding Service Unit Tests
 *
 * Tests for pure functions in embedding service.
 * Note: We only test functions that don't require external API calls.
 */

import { getModelInfo } from '../../services/embedding.service';

describe('Embedding Service - Pure Functions', () => {
  describe('getModelInfo', () => {
    it('should return model information object', () => {
      const info = getModelInfo();

      expect(info).toBeDefined();
      expect(typeof info).toBe('object');
    });

    it('should have correct model name', () => {
      const info = getModelInfo();

      expect(info.name).toBe('BAAI/bge-m3');
    });

    it('should have correct dimensions', () => {
      const info = getModelInfo();

      expect(info.dimensions).toBe(1024);
    });

    it('should have correct provider', () => {
      const info = getModelInfo();

      expect(info.provider).toBe('HuggingFace');
    });

    it('should have maxTextLength property', () => {
      const info = getModelInfo();

      expect(info.maxTextLength).toBeDefined();
      expect(typeof info.maxTextLength).toBe('number');
      expect(info.maxTextLength).toBeGreaterThan(0);
    });

    it('should have all required properties', () => {
      const info = getModelInfo();

      expect(info).toHaveProperty('name');
      expect(info).toHaveProperty('dimensions');
      expect(info).toHaveProperty('maxTextLength');
      expect(info).toHaveProperty('provider');
    });
  });
});
