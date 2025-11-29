/**
 * Search Service
 *
 * Handles semantic search operations:
 * - Query embedding generation
 * - Vector similarity search
 * - Result ranking and formatting
 */

import { logger } from '../../../utils/logger';
import HttpException from '../../../utils/httpException';
import { niraNamespace } from './pinecone.service';
import { embedText } from './embedding.service';
import { ISearchResult } from '../shared/interface';
import { chatbotConfig } from '../config/chatbot.config';

const { search: searchConfig } = chatbotConfig;

/**
 * Search for relevant document chunks based on a query
 * @param query - Search query text
 * @param topK - Number of results to return (default: 5)
 * @returns Array of search results with scores
 */
export async function searchDocuments(
  query: string,
  topK: number = searchConfig.defaultTopK
): Promise<ISearchResult[]> {
  try {
    if (!query || query.trim().length === 0) {
      throw new HttpException(400, 'Search query cannot be empty');
    }

    logger.info(`🔍 Searching for: "${query.substring(0, 50)}..."`);

    // Generate embedding for the query
    const queryEmbedding = await embedText(query);

    // Search in Pinecone
    const searchResponse = await niraNamespace.query({
      vector: queryEmbedding,
      topK: Math.min(topK, searchConfig.maxTopK),
      includeMetadata: true,
    });

    // Transform results
    const results: ISearchResult[] = (searchResponse.matches || [])
      .filter(match => match.score && match.score >= searchConfig.minSimilarityThreshold)
      .map(match => ({
        id: match.id,
        score: match.score || 0,
        text: (match.metadata?.text as string) || '',
        metadata: {
          documentId: match.metadata?.documentId as number,
          documentName: match.metadata?.documentName as string,
          chunkIndex: match.metadata?.chunkIndex as number,
          totalChunks: match.metadata?.totalChunks as number,
          text: match.metadata?.text as string,
          mimeType: match.metadata?.mimeType as string,
        },
      }));

    logger.info(`✅ Found ${results.length} relevant results`);

    return results;
  } catch (error) {
    logger.error('❌ Search failed:', error);
    if (error instanceof HttpException) throw error;
    throw new HttpException(
      500,
      `Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Build context string from search results for LLM
 * @param results - Search results
 * @param maxChars - Maximum characters for context
 * @returns Formatted context string
 */
export function buildContextFromResults(
  results: ISearchResult[],
  maxChars: number = chatbotConfig.chat.maxContextChars
): string {
  if (results.length === 0) {
    return '';
  }

  const contextParts: string[] = [];
  let totalLength = 0;

  for (const result of results) {
    // Format: [Document: name] content
    const part = `[Document: ${result.metadata.documentName}]\n${result.text}`;

    if (totalLength + part.length > maxChars) {
      // Add truncated version if there's room
      const remaining = maxChars - totalLength;
      if (remaining > 100) {
        contextParts.push(part.substring(0, remaining) + '...');
      }
      break;
    }

    contextParts.push(part);
    totalLength += part.length + 2; // +2 for separator
  }

  return contextParts.join('\n\n---\n\n');
}

/**
 * Extract unique source references from search results
 * @param results - Search results
 * @returns Array of unique document sources with relevance
 */
export function extractSourceReferences(
  results: ISearchResult[]
): Array<{ documentId: number; documentName: string; relevance: number }> {
  const sourceMap = new Map<number, { documentName: string; maxScore: number }>();

  for (const result of results) {
    const existing = sourceMap.get(result.metadata.documentId);

    if (!existing || result.score > existing.maxScore) {
      sourceMap.set(result.metadata.documentId, {
        documentName: result.metadata.documentName,
        maxScore: result.score,
      });
    }
  }

  return Array.from(sourceMap.entries())
    .map(([documentId, { documentName, maxScore }]) => ({
      documentId,
      documentName,
      relevance: Math.round(maxScore * 100) / 100, // Round to 2 decimal places
    }))
    .sort((a, b) => b.relevance - a.relevance);
}

/**
 * Check if any documents exist in the vector store
 */
export async function hasDocuments(): Promise<boolean> {
  try {
    const { pineconeIndex } = await import('./pinecone.service');
    const stats = await pineconeIndex.describeIndexStats();
    
    const namespaceStats = stats.namespaces?.[chatbotConfig.general.namespace];
    
    return (namespaceStats?.recordCount || 0) > 0;
  } catch (error) {
    logger.error('Error checking for documents:', error);
    return false;
  }
}

/**
 * Search with filters (for future use)
 */
export async function searchWithFilters(
  query: string,
  filters?: {
    documentIds?: number[];
    mimeTypes?: string[];
  },
  topK: number = searchConfig.defaultTopK
): Promise<ISearchResult[]> {
  try {
    const queryEmbedding = await embedText(query);

    // Build filter object
    const filter: Record<string, unknown> = {};
    
    if (filters?.documentIds && filters.documentIds.length > 0) {
      filter.documentId = { $in: filters.documentIds };
    }
    
    if (filters?.mimeTypes && filters.mimeTypes.length > 0) {
      filter.mimeType = { $in: filters.mimeTypes };
    }

    const searchResponse = await niraNamespace.query({
      vector: queryEmbedding,
      topK: Math.min(topK, searchConfig.maxTopK),
      includeMetadata: true,
      filter: Object.keys(filter).length > 0 ? filter : undefined,
    });

    return (searchResponse.matches || [])
      .filter(match => match.score && match.score >= searchConfig.minSimilarityThreshold)
      .map(match => ({
        id: match.id,
        score: match.score || 0,
        text: (match.metadata?.text as string) || '',
        metadata: {
          documentId: match.metadata?.documentId as number,
          documentName: match.metadata?.documentName as string,
          chunkIndex: match.metadata?.chunkIndex as number,
          totalChunks: match.metadata?.totalChunks as number,
          text: match.metadata?.text as string,
          mimeType: match.metadata?.mimeType as string,
        },
      }));
  } catch (error) {
    logger.error('❌ Filtered search failed:', error);
    throw new HttpException(
      500,
      `Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
