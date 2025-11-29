/**
 * Chunker Service Unit Tests
 *
 * Tests for text chunking functions - pure functions with no external dependencies.
 */

import { chunkText, chunkTextFixed, estimateChunkCount } from '../../services/chunker.service';
import { IChunk } from '../../shared/interface';

describe('Chunker Service', () => {
  describe('chunkText', () => {
    it('should return empty result for empty text', () => {
      const result = chunkText('');

      expect(result.chunks).toEqual([]);
      expect(result.totalChunks).toBe(0);
      expect(result.originalLength).toBe(0);
    });

    it('should return empty result for whitespace-only text', () => {
      const result = chunkText('   \n\n   ');

      expect(result.chunks).toEqual([]);
      expect(result.totalChunks).toBe(0);
    });

    it('should create a single chunk for short text', () => {
      const shortText = 'This is a short piece of text that should fit in one chunk.';
      const result = chunkText(shortText);

      expect(result.totalChunks).toBe(1);
      expect(result.chunks[0].text).toContain('This is a short piece');
      expect(result.chunks[0].index).toBe(0);
    });

    it('should create multiple chunks for long text', () => {
      // Create text that exceeds max chunk size (1200 chars)
      const longText = Array(50)
        .fill('This is a sentence that will be repeated many times to create long text. ')
        .join('');

      const result = chunkText(longText);

      expect(result.totalChunks).toBeGreaterThan(1);
      expect(result.originalLength).toBe(longText.length);
    });

    it('should preserve chunk indices', () => {
      const longText = Array(30)
        .fill('Sentence number one. Sentence number two. Sentence number three. ')
        .join('');

      const result = chunkText(longText);

      result.chunks.forEach((chunk: IChunk, index: number) => {
        expect(chunk.index).toBe(index);
      });
    });

    it('should have start and end positions for each chunk', () => {
      const text = 'First sentence here. Second sentence here. Third sentence here. Fourth sentence.';
      const result = chunkText(text);

      result.chunks.forEach((chunk: IChunk) => {
        expect(chunk.startPosition).toBeGreaterThanOrEqual(0);
        expect(chunk.endPosition).toBeGreaterThan(chunk.startPosition);
      });
    });
  });

  describe('chunkTextFixed', () => {
    it('should return empty result for empty text', () => {
      const result = chunkTextFixed('');

      expect(result.chunks).toEqual([]);
      expect(result.totalChunks).toBe(0);
    });

    it('should chunk text with default chunk size', () => {
      const longText = Array(20)
        .fill('This is a test sentence that will be used for chunking. ')
        .join('');

      const result = chunkTextFixed(longText);

      expect(result.totalChunks).toBeGreaterThanOrEqual(1);
      expect(result.originalLength).toBe(longText.length);
    });

    it('should respect custom chunk size', () => {
      const text = 'This is a sample text for testing custom chunk sizes in the chunker service.';
      const customChunkSize = 30;

      const result = chunkTextFixed(text, customChunkSize, 0);

      // Each chunk should be around the custom chunk size (may vary due to boundary detection)
      result.chunks.forEach((chunk: IChunk) => {
        expect(chunk.text.length).toBeLessThanOrEqual(customChunkSize + 50); // Allow some margin for boundary detection
      });
    });

    it('should handle overlap parameter', () => {
      const text = Array(10)
        .fill('Testing overlap functionality in text chunking. ')
        .join('');

      const resultWithOverlap = chunkTextFixed(text, 100, 20);
      const resultWithoutOverlap = chunkTextFixed(text, 100, 0);

      // Both should create chunks from the same text
      expect(resultWithOverlap.chunks.length).toBeGreaterThan(0);
      expect(resultWithoutOverlap.chunks.length).toBeGreaterThan(0);

      // Each chunk should respect the max size
      resultWithOverlap.chunks.forEach((chunk: IChunk) => {
        expect(chunk.text.length).toBeLessThanOrEqual(100);
      });
      resultWithoutOverlap.chunks.forEach((chunk: IChunk) => {
        expect(chunk.text.length).toBeLessThanOrEqual(100);
      });
    });
  });

  describe('estimateChunkCount', () => {
    it('should estimate 0 chunks for 0 length', () => {
      const estimate = estimateChunkCount(0);
      expect(estimate).toBe(0);
    });

    it('should estimate at least 1 chunk for any positive length', () => {
      const estimate = estimateChunkCount(100);
      expect(estimate).toBeGreaterThanOrEqual(1);
    });

    it('should increase estimate with larger text', () => {
      const smallEstimate = estimateChunkCount(1000);
      const largeEstimate = estimateChunkCount(10000);

      expect(largeEstimate).toBeGreaterThan(smallEstimate);
    });

    it('should provide reasonable estimates', () => {
      // For a 5000 character document with ~800 char target chunks and 25% overlap
      // Effective chunk size is ~600 chars, so ~8-9 chunks expected
      const estimate = estimateChunkCount(5000);

      expect(estimate).toBeGreaterThan(5);
      expect(estimate).toBeLessThan(20);
    });
  });
});
