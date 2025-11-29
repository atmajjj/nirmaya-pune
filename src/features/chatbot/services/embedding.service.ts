/**
 * Embedding Service
 *
 * Handles text embedding generation using HuggingFace BGE-M3 model.
 * BGE-M3 provides 1024-dimensional embeddings with excellent multilingual support.
 */

import { HfInference } from '@huggingface/inference';
import { logger } from '../../../utils/logger';
import { config } from '../../../utils/validateEnv';
import { chatbotConfig } from '../config/chatbot.config';
import HttpException from '../../../utils/httpException';

// Initialize HuggingFace client
const hf = new HfInference(config.HUGGINGFACE_TOKEN);

const { embedding: embeddingConfig } = chatbotConfig;

/**
 * Generate embedding for a single text
 * @param text - Text to embed
 * @returns 1024-dimensional embedding vector
 */
export async function embedText(text: string): Promise<number[]> {
  try {
    if (!text || text.trim().length === 0) {
      throw new HttpException(400, 'Text input cannot be empty');
    }

    // Clean whitespace
    const cleanedText = text.replace(/\s+/g, ' ').trim();

    // Truncate if too long
    const truncatedText =
      cleanedText.length > embeddingConfig.maxTextLength
        ? cleanedText.substring(0, embeddingConfig.maxTextLength)
        : cleanedText;

    logger.debug(`🔤 Generating BGE-M3 embedding for text (${truncatedText.length} chars)`);

    const embedding = await generateEmbeddingWithRetry(truncatedText);

    return embedding;
  } catch (error) {
    logger.error('❌ BGE-M3 embedding generation failed:', error);
    if (error instanceof HttpException) throw error;
    throw new HttpException(
      500,
      `Embedding generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Generate embeddings for multiple texts (batch processing)
 * @param texts - Array of texts to embed
 * @returns Array of 1024-dimensional embedding vectors
 */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  try {
    if (!texts || texts.length === 0) {
      return [];
    }

    logger.info(`🔄 Generating BGE-M3 embeddings for ${texts.length} texts`);

    const results: number[][] = [];
    const batches = createBatches(texts, embeddingConfig.maxBatchSize);

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      logger.debug(`📦 Processing batch ${i + 1}/${batches.length} (${batch.length} texts)`);

      // Process batch in parallel
      const batchResults = await Promise.all(batch.map(text => embedText(text)));

      results.push(...batchResults);

      // Rate limiting: small delay between batches
      if (i < batches.length - 1) {
        await delay(embeddingConfig.retryDelay);
      }
    }

    logger.info(`✅ Generated ${results.length} BGE-M3 embeddings successfully`);
    return results;
  } catch (error) {
    logger.error('❌ BGE-M3 batch embedding failed:', error);
    throw new HttpException(
      500,
      `Batch embedding failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Generate embedding with retry logic
 */
async function generateEmbeddingWithRetry(text: string, attempt: number = 1): Promise<number[]> {
  try {
    const response = await hf.featureExtraction({
      model: embeddingConfig.modelName,
      inputs: text,
    });

    // Handle different response formats
    let embedding: number[];

    if (Array.isArray(response)) {
      // If response is array of arrays, take first
      embedding = Array.isArray(response[0]) ? (response[0] as number[]) : (response as number[]);
    } else {
      embedding = response as number[];
    }

    // Validate embedding dimensions
    if (embedding.length !== embeddingConfig.dimensions) {
      logger.warn(
        `⚠️ Unexpected embedding dimensions: ${embedding.length}, expected: ${embeddingConfig.dimensions}`
      );
    }

    return embedding;
  } catch (error) {
    if (attempt < embeddingConfig.retryAttempts) {
      logger.warn(`⚠️ Embedding attempt ${attempt} failed, retrying...`);
      await delay(embeddingConfig.retryDelay * attempt);
      return generateEmbeddingWithRetry(text, attempt + 1);
    }
    throw error;
  }
}

/**
 * Create batches from an array
 */
function createBatches<T>(items: T[], batchSize: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize));
  }
  return batches;
}

/**
 * Delay utility
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Get model information
 */
export function getModelInfo() {
  return {
    name: embeddingConfig.modelName,
    dimensions: embeddingConfig.dimensions,
    maxTextLength: embeddingConfig.maxTextLength,
    provider: 'HuggingFace',
  };
}
