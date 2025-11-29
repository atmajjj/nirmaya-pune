/**
 * Chunker Service
 *
 * Handles text chunking with semantic awareness.
 * Splits documents into optimal chunks for embedding while preserving meaning.
 */

import { logger } from '../../../utils/logger';
import { chatbotConfig } from '../config/chatbot.config';
import { IChunk, IChunkingResult } from '../shared/interface';

const { chunking: chunkingConfig } = chatbotConfig;

/**
 * Split text into semantic chunks
 * @param text - Full text to chunk
 * @returns Chunking result with chunks and metadata
 */
export function chunkText(text: string): IChunkingResult {
  try {
    if (!text || text.trim().length === 0) {
      return {
        chunks: [],
        totalChunks: 0,
        originalLength: 0,
      };
    }

    const originalLength = text.length;
    logger.debug(`📝 Chunking text of ${originalLength} characters`);

    // Split into sentences first
    const sentences = splitIntoSentences(text);
    
    // Build chunks from sentences
    const chunks = buildChunksFromSentences(sentences);

    logger.info(`✅ Created ${chunks.length} chunks from ${originalLength} characters`);

    return {
      chunks,
      totalChunks: chunks.length,
      originalLength,
    };
  } catch (error) {
    logger.error('❌ Text chunking failed:', error);
    throw error;
  }
}

/**
 * Split text into sentences
 */
function splitIntoSentences(text: string): string[] {
  // Split by sentence-ending punctuation followed by space or newline
  const sentenceRegex = /(?<=[.!?])\s+(?=[A-Z])|(?<=\n\n)/g;
  
  const rawSentences = text.split(sentenceRegex);
  
  // Filter out empty sentences and trim
  const sentences = rawSentences
    .map(s => s.trim())
    .filter(s => s.length > 0);

  return sentences;
}

/**
 * Build chunks from sentences with overlap
 */
function buildChunksFromSentences(sentences: string[]): IChunk[] {
  const chunks: IChunk[] = [];
  let currentChunk: string[] = [];
  let currentLength = 0;
  let startPosition = 0;
  let currentPosition = 0;

  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i];
    const sentenceLength = sentence.length;

    // If adding this sentence would exceed max chunk size
    if (currentLength + sentenceLength > chunkingConfig.maxChunkSize && currentChunk.length > 0) {
      // Save current chunk
      const chunkText = currentChunk.join(' ');
      chunks.push({
        text: chunkText,
        index: chunks.length,
        startPosition,
        endPosition: currentPosition,
      });

      // Calculate overlap - keep some sentences for context
      const overlapSentences = calculateOverlapSentences(currentChunk);
      
      // Start new chunk with overlap
      currentChunk = overlapSentences;
      currentLength = overlapSentences.join(' ').length;
      startPosition = currentPosition - currentLength;
    }

    // Add sentence to current chunk
    currentChunk.push(sentence);
    currentLength += sentenceLength + 1; // +1 for space
    currentPosition += sentenceLength + 1;
  }

  // Don't forget the last chunk
  if (currentChunk.length > 0) {
    const chunkText = currentChunk.join(' ');
    
    // Only add if it meets minimum size or it's the only content
    if (chunkText.length >= chunkingConfig.minChunkSize || chunks.length === 0) {
      chunks.push({
        text: chunkText,
        index: chunks.length,
        startPosition,
        endPosition: currentPosition,
      });
    } else if (chunks.length > 0) {
      // Merge with previous chunk if too small
      const lastChunk = chunks[chunks.length - 1];
      chunks[chunks.length - 1] = {
        ...lastChunk,
        text: lastChunk.text + ' ' + chunkText,
        endPosition: currentPosition,
      };
    }
  }

  return chunks;
}

/**
 * Calculate sentences to keep for overlap
 */
function calculateOverlapSentences(sentences: string[]): string[] {
  const overlapRatio = chunkingConfig.overlapPercentage / 100;
  const targetOverlapLength = Math.floor(
    sentences.join(' ').length * overlapRatio
  );

  const overlapSentences: string[] = [];
  let overlapLength = 0;

  // Take sentences from the end until we reach target overlap
  for (let i = sentences.length - 1; i >= 0 && overlapLength < targetOverlapLength; i--) {
    overlapSentences.unshift(sentences[i]);
    overlapLength += sentences[i].length + 1;
  }

  return overlapSentences;
}

/**
 * Chunk text with fixed size (alternative simpler method)
 */
export function chunkTextFixed(text: string, chunkSize?: number, overlap?: number): IChunkingResult {
  const size = chunkSize || chunkingConfig.targetChunkSize;
  const overlapSize = overlap || Math.floor(size * (chunkingConfig.overlapPercentage / 100));

  const chunks: IChunk[] = [];
  let position = 0;

  while (position < text.length) {
    let endPosition = position + size;

    // Try to find a sentence boundary near the end
    if (endPosition < text.length) {
      const searchStart = Math.max(position + size - 100, position);
      const searchText = text.substring(searchStart, endPosition + 50);
      
      // Look for sentence end markers
      const boundaryMatch = searchText.match(/[.!?]\s+/);
      if (boundaryMatch && boundaryMatch.index !== undefined) {
        endPosition = searchStart + boundaryMatch.index + boundaryMatch[0].length;
      }
    } else {
      endPosition = text.length;
    }

    const chunkText = text.substring(position, endPosition).trim();

    if (chunkText.length > 0) {
      chunks.push({
        text: chunkText,
        index: chunks.length,
        startPosition: position,
        endPosition,
      });
    }

    // Move position forward, accounting for overlap
    position = endPosition - overlapSize;

    // Prevent infinite loop
    if (position <= chunks[chunks.length - 1]?.startPosition) {
      position = endPosition;
    }
  }

  return {
    chunks,
    totalChunks: chunks.length,
    originalLength: text.length,
  };
}

/**
 * Estimate number of chunks for a text
 */
export function estimateChunkCount(textLength: number): number {
  const effectiveChunkSize = chunkingConfig.targetChunkSize * (1 - chunkingConfig.overlapPercentage / 100);
  return Math.ceil(textLength / effectiveChunkSize);
}
