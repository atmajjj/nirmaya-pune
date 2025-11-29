/**
 * Vector Service
 *
 * Handles vector operations with Pinecone:
 * - Upsert vectors
 * - Delete vectors
 * - Fetch vectors
 */

import { logger } from '../../../utils/logger';
import HttpException from '../../../utils/httpException';
import { niraNamespace } from './pinecone.service';
import { embedTexts } from './embedding.service';
import { IVectorRecord, IVectorMetadata, IChunk } from '../shared/interface';
import { chatbotConfig } from '../config/chatbot.config';

/**
 * Create and upsert vectors for document chunks
 * @param chunks - Document chunks to vectorize
 * @param documentId - Document ID for metadata
 * @param documentName - Document name for metadata
 * @param mimeType - Document MIME type
 * @returns Array of vector IDs
 */
export async function upsertDocumentVectors(
  chunks: IChunk[],
  documentId: number,
  documentName: string,
  mimeType: string
): Promise<string[]> {
  try {
    if (chunks.length === 0) {
      logger.warn('No chunks to upsert');
      return [];
    }

    logger.info(`🔄 Upserting ${chunks.length} vectors for document ${documentId}`);

    // Extract texts from chunks
    const texts = chunks.map(chunk => chunk.text);

    // Generate embeddings for all chunks
    const embeddings = await embedTexts(texts);

    // Create vector records
    const vectorRecords: IVectorRecord[] = chunks.map((chunk, index) => ({
      id: generateVectorId(documentId, chunk.index),
      values: embeddings[index],
      metadata: {
        documentId,
        documentName,
        chunkIndex: chunk.index,
        totalChunks: chunks.length,
        text: chunk.text,
        mimeType,
      },
    }));

    // Upsert to Pinecone in batches
    const batchSize = 100; // Pinecone recommends batches of 100
    const vectorIds: string[] = [];

    for (let i = 0; i < vectorRecords.length; i += batchSize) {
      const batch = vectorRecords.slice(i, i + batchSize);
      
      await niraNamespace.upsert(
        batch.map(record => ({
          id: record.id,
          values: record.values,
          metadata: {
            documentId: record.metadata.documentId,
            documentName: record.metadata.documentName,
            chunkIndex: record.metadata.chunkIndex,
            totalChunks: record.metadata.totalChunks,
            text: record.metadata.text,
            mimeType: record.metadata.mimeType,
          },
        }))
      );

      vectorIds.push(...batch.map(r => r.id));
      
      logger.debug(`📦 Upserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(vectorRecords.length / batchSize)}`);
    }

    logger.info(`✅ Successfully upserted ${vectorIds.length} vectors`);

    return vectorIds;
  } catch (error) {
    logger.error('❌ Vector upsert failed:', error);
    throw new HttpException(
      500,
      `Vector upsert failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Delete all vectors for a document
 * @param documentId - Document ID
 * @param vectorIds - Array of vector IDs to delete (optional, if known)
 */
export async function deleteDocumentVectors(
  documentId: number,
  vectorIds?: string[]
): Promise<void> {
  try {
    logger.info(`🗑️ Deleting vectors for document ${documentId}`);

    if (vectorIds && vectorIds.length > 0) {
      // Delete by IDs if provided
      const batchSize = 1000; // Pinecone limit
      
      for (let i = 0; i < vectorIds.length; i += batchSize) {
        const batch = vectorIds.slice(i, i + batchSize);
        await niraNamespace.deleteMany(batch);
      }
      
      logger.info(`✅ Deleted ${vectorIds.length} vectors by ID`);
    } else {
      // Delete by metadata filter (document ID)
      // Note: This requires Pinecone to support metadata filtering for delete
      // If not supported, we need to fetch vector IDs first
      try {
        await niraNamespace.deleteMany({
          filter: {
            documentId: { $eq: documentId },
          },
        });
        logger.info(`✅ Deleted vectors by document ID filter`);
      } catch (filterError) {
        // Fallback: Generate expected vector IDs based on pattern
        logger.warn('Metadata filter delete not supported, using ID pattern');
        const estimatedIds = generateEstimatedVectorIds(documentId, 1000);
        
        if (estimatedIds.length > 0) {
          await niraNamespace.deleteMany(estimatedIds);
        }
      }
    }
  } catch (error) {
    logger.error('❌ Vector deletion failed:', error);
    throw new HttpException(
      500,
      `Vector deletion failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Fetch vectors by IDs
 * @param vectorIds - Array of vector IDs
 * @returns Vector records
 */
export async function fetchVectors(vectorIds: string[]): Promise<IVectorRecord[]> {
  try {
    if (vectorIds.length === 0) {
      return [];
    }

    const response = await niraNamespace.fetch(vectorIds);

    const records: IVectorRecord[] = [];
    
    if (response.records) {
      for (const [id, record] of Object.entries(response.records)) {
        if (record) {
          records.push({
            id,
            values: record.values || [],
            metadata: record.metadata as unknown as IVectorMetadata,
          });
        }
      }
    }

    return records;
  } catch (error) {
    logger.error('❌ Vector fetch failed:', error);
    throw new HttpException(
      500,
      `Vector fetch failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Get vector statistics for the namespace
 */
export async function getVectorStats(): Promise<{
  totalVectors: number;
  dimension: number;
}> {
  try {
    const { pineconeIndex } = await import('./pinecone.service');
    const stats = await pineconeIndex.describeIndexStats();

    const namespaceStats = stats.namespaces?.[chatbotConfig.general.namespace];

    return {
      totalVectors: namespaceStats?.recordCount || 0,
      dimension: stats.dimension || 0,
    };
  } catch (error) {
    logger.error('Error getting vector stats:', error);
    throw error;
  }
}

/**
 * Generate a unique vector ID for a document chunk
 */
function generateVectorId(documentId: number, chunkIndex: number): string {
  return `doc_${documentId}_chunk_${chunkIndex}`;
}

/**
 * Generate estimated vector IDs for a document (for deletion fallback)
 */
function generateEstimatedVectorIds(documentId: number, maxChunks: number): string[] {
  const ids: string[] = [];
  for (let i = 0; i < maxChunks; i++) {
    ids.push(generateVectorId(documentId, i));
  }
  return ids;
}

/**
 * Parse document ID from vector ID
 */
export function parseVectorId(vectorId: string): { documentId: number; chunkIndex: number } | null {
  const match = vectorId.match(/^doc_(\d+)_chunk_(\d+)$/);
  if (match) {
    return {
      documentId: parseInt(match[1], 10),
      chunkIndex: parseInt(match[2], 10),
    };
  }
  return null;
}
