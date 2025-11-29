/**
 * Pinecone Service
 *
 * Handles connection and operations with Pinecone vector database.
 */

import { Pinecone } from '@pinecone-database/pinecone';
import { logger } from '../../../utils/logger';
import { config } from '../../../utils/validateEnv';
import { chatbotConfig } from '../config/chatbot.config';

// Initialize Pinecone client
const pinecone = new Pinecone({
  apiKey: config.PINECONE_API_KEY,
});

// Get the index
const indexName = config.PINECONE_INDEX_NAME;
export const pineconeIndex = pinecone.index(indexName);

// Get the namespace for NIRA AI (single global namespace)
export const niraNamespace = pineconeIndex.namespace(chatbotConfig.general.namespace);

/**
 * Initialize and test Pinecone connection
 */
export async function initializePinecone(): Promise<boolean> {
  try {
    logger.info('🔄 Testing Pinecone connection...');

    // Test connection by getting index stats
    const stats = await pineconeIndex.describeIndexStats();

    logger.info('✅ Pinecone connection successful');
    logger.info(`📊 Pinecone index stats - Total records: ${stats.totalRecordCount}, Dimension: ${stats.dimension}`);

    return true;
  } catch (error) {
    logger.error('❌ Pinecone connection failed:', error);
    return false;
  }
}

/**
 * Get index statistics
 */
export async function getIndexStats() {
  try {
    const stats = await pineconeIndex.describeIndexStats();
    return {
      totalRecords: stats.totalRecordCount,
      dimension: stats.dimension,
      namespaces: stats.namespaces,
    };
  } catch (error) {
    logger.error('Error getting Pinecone index stats:', error);
    throw error;
  }
}

/**
 * Health check for Pinecone
 */
export async function pineconeHealthCheck(): Promise<{
  healthy: boolean;
  message: string;
  stats?: object;
}> {
  try {
    const stats = await getIndexStats();
    return {
      healthy: true,
      message: 'Pinecone connection is healthy',
      stats,
    };
  } catch (error) {
    return {
      healthy: false,
      message: `Pinecone connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

export default pinecone;
