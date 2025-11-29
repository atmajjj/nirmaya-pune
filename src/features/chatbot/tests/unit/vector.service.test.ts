/**
 * Vector Service Unit Tests
 *
 * Tests for pure functions in vector service - no external API calls.
 */

import { parseVectorId } from '../../services/vector.service';

describe('Vector Service - Pure Functions', () => {
  describe('parseVectorId', () => {
    describe('valid vector IDs', () => {
      it('should parse standard vector ID', () => {
        const result = parseVectorId('doc_1_chunk_0');

        expect(result).not.toBeNull();
        expect(result!.documentId).toBe(1);
        expect(result!.chunkIndex).toBe(0);
      });

      it('should parse vector ID with large document ID', () => {
        const result = parseVectorId('doc_12345_chunk_99');

        expect(result).not.toBeNull();
        expect(result!.documentId).toBe(12345);
        expect(result!.chunkIndex).toBe(99);
      });

      it('should parse vector ID with large chunk index', () => {
        const result = parseVectorId('doc_1_chunk_999');

        expect(result).not.toBeNull();
        expect(result!.documentId).toBe(1);
        expect(result!.chunkIndex).toBe(999);
      });

      it('should parse vector ID with zero chunk index', () => {
        const result = parseVectorId('doc_100_chunk_0');

        expect(result).not.toBeNull();
        expect(result!.documentId).toBe(100);
        expect(result!.chunkIndex).toBe(0);
      });

      it('should parse vector ID with multi-digit values', () => {
        const result = parseVectorId('doc_999999_chunk_888888');

        expect(result).not.toBeNull();
        expect(result!.documentId).toBe(999999);
        expect(result!.chunkIndex).toBe(888888);
      });
    });

    describe('invalid vector IDs', () => {
      it('should return null for empty string', () => {
        const result = parseVectorId('');

        expect(result).toBeNull();
      });

      it('should return null for malformed ID - missing doc prefix', () => {
        const result = parseVectorId('1_chunk_0');

        expect(result).toBeNull();
      });

      it('should return null for malformed ID - missing chunk prefix', () => {
        const result = parseVectorId('doc_1_0');

        expect(result).toBeNull();
      });

      it('should return null for malformed ID - wrong separator', () => {
        const result = parseVectorId('doc-1-chunk-0');

        expect(result).toBeNull();
      });

      it('should return null for non-numeric document ID', () => {
        const result = parseVectorId('doc_abc_chunk_0');

        expect(result).toBeNull();
      });

      it('should return null for non-numeric chunk index', () => {
        const result = parseVectorId('doc_1_chunk_abc');

        expect(result).toBeNull();
      });

      it('should return null for negative document ID', () => {
        const result = parseVectorId('doc_-1_chunk_0');

        expect(result).toBeNull();
      });

      it('should return null for extra underscores', () => {
        const result = parseVectorId('doc__1_chunk_0');

        expect(result).toBeNull();
      });

      it('should return null for trailing text', () => {
        const result = parseVectorId('doc_1_chunk_0_extra');

        expect(result).toBeNull();
      });

      it('should return null for leading text', () => {
        const result = parseVectorId('prefix_doc_1_chunk_0');

        expect(result).toBeNull();
      });

      it('should return null for spaces in ID', () => {
        const result = parseVectorId('doc_1_chunk _0');

        expect(result).toBeNull();
      });

      it('should return null for random string', () => {
        const result = parseVectorId('random_string_here');

        expect(result).toBeNull();
      });

      it('should return null for just numbers', () => {
        const result = parseVectorId('12345');

        expect(result).toBeNull();
      });
    });

    describe('edge cases', () => {
      it('should handle very large numbers correctly', () => {
        const result = parseVectorId('doc_2147483647_chunk_2147483647');

        expect(result).not.toBeNull();
        expect(result!.documentId).toBe(2147483647);
        expect(result!.chunkIndex).toBe(2147483647);
      });

      it('should parse ID with leading zeros as valid', () => {
        const result = parseVectorId('doc_001_chunk_001');

        expect(result).not.toBeNull();
        expect(result!.documentId).toBe(1);
        expect(result!.chunkIndex).toBe(1);
      });
    });
  });
});
