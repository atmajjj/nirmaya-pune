/**
 * Search Service Unit Tests
 *
 * Tests for pure functions in search service - no external API calls.
 */

import { buildContextFromResults, extractSourceReferences } from '../../services/search.service';
import { ISearchResult } from '../../shared/interface';

describe('Search Service - Pure Functions', () => {
  // Sample search results for testing
  const sampleResults: ISearchResult[] = [
    {
      id: 'doc_1_chunk_0',
      score: 0.95,
      text: 'This is the first document content about machine learning.',
      metadata: {
        documentId: 1,
        documentName: 'ML Basics.pdf',
        chunkIndex: 0,
        totalChunks: 5,
        text: 'This is the first document content about machine learning.',
        mimeType: 'application/pdf',
      },
    },
    {
      id: 'doc_1_chunk_1',
      score: 0.85,
      text: 'Another chunk from the same document about neural networks.',
      metadata: {
        documentId: 1,
        documentName: 'ML Basics.pdf',
        chunkIndex: 1,
        totalChunks: 5,
        text: 'Another chunk from the same document about neural networks.',
        mimeType: 'application/pdf',
      },
    },
    {
      id: 'doc_2_chunk_0',
      score: 0.75,
      text: 'Content from a different document about data science.',
      metadata: {
        documentId: 2,
        documentName: 'Data Science Guide.docx',
        chunkIndex: 0,
        totalChunks: 3,
        text: 'Content from a different document about data science.',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      },
    },
  ];

  describe('buildContextFromResults', () => {
    it('should return empty string for empty results', () => {
      const context = buildContextFromResults([]);
      expect(context).toBe('');
    });

    it('should format single result correctly', () => {
      const context = buildContextFromResults([sampleResults[0]]);

      expect(context).toContain('[Document: ML Basics.pdf]');
      expect(context).toContain('machine learning');
    });

    it('should format multiple results with separators', () => {
      const context = buildContextFromResults(sampleResults);

      expect(context).toContain('[Document: ML Basics.pdf]');
      expect(context).toContain('[Document: Data Science Guide.docx]');
      expect(context).toContain('---'); // Separator
    });

    it('should respect maxChars limit', () => {
      const maxChars = 100;
      const context = buildContextFromResults(sampleResults, maxChars);

      // Context should not exceed maxChars significantly
      expect(context.length).toBeLessThanOrEqual(maxChars + 50); // Allow some margin for truncation text
    });

    it('should include all results when under maxChars', () => {
      const maxChars = 10000;
      const context = buildContextFromResults(sampleResults, maxChars);

      // All documents should be mentioned
      expect(context).toContain('ML Basics.pdf');
      expect(context).toContain('Data Science Guide.docx');
    });

    it('should add ellipsis when truncating', () => {
      const maxChars = 150;
      const context = buildContextFromResults(sampleResults, maxChars);

      // If truncated, should end with ...
      if (context.length > 100) {
        // Only check if some truncation might have occurred
        expect(context.includes('...')).toBe(true);
      }
    });
  });

  describe('extractSourceReferences', () => {
    it('should return empty array for empty results', () => {
      const sources = extractSourceReferences([]);
      expect(sources).toEqual([]);
    });

    it('should extract unique documents', () => {
      const sources = extractSourceReferences(sampleResults);

      // Should have 2 unique documents (doc 1 and doc 2)
      expect(sources.length).toBe(2);
    });

    it('should use highest score for duplicate documents', () => {
      const sources = extractSourceReferences(sampleResults);

      // Document 1 has scores 0.95 and 0.85, should use 0.95
      const doc1 = sources.find(s => s.documentId === 1);
      expect(doc1?.relevance).toBe(0.95);
    });

    it('should sort by relevance descending', () => {
      const sources = extractSourceReferences(sampleResults);

      // First source should have highest relevance
      expect(sources[0].relevance).toBeGreaterThanOrEqual(sources[1].relevance);
    });

    it('should include document name', () => {
      const sources = extractSourceReferences(sampleResults);

      const doc1 = sources.find(s => s.documentId === 1);
      expect(doc1?.documentName).toBe('ML Basics.pdf');
    });

    it('should round relevance to 2 decimal places', () => {
      const resultsWithLongDecimals: ISearchResult[] = [
        {
          id: 'test_1',
          score: 0.123456789,
          text: 'Test content',
          metadata: {
            documentId: 1,
            documentName: 'Test.pdf',
            chunkIndex: 0,
            totalChunks: 1,
            text: 'Test content',
            mimeType: 'application/pdf',
          },
        },
      ];

      const sources = extractSourceReferences(resultsWithLongDecimals);

      // Should be rounded to 2 decimal places
      expect(sources[0].relevance).toBe(0.12);
    });
  });
});
