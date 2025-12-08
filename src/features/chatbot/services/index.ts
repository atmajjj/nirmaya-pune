/**
 * Chatbot Services Index
 *
 * Re-exports all chatbot services for convenient imports.
 */

// Pinecone service
export {
  pineconeIndex,
  niraNamespace,
  initializePinecone,
  getIndexStats,
  pineconeHealthCheck,
} from './pinecone.service';

// Embedding service
export {
  embedText,
  embedTexts,
  getModelInfo,
} from './embedding.service';

// Document processor service
export {
  extractTextFromDocument,
  extractTextFromBuffer,
  isValidFileType,
  isValidFileSize,
  getExtensionFromMimeType,
} from './document-processor.service';

// Document utilities (pure validation functions)
export {
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE,
  validateDocument,
} from './document-utils.service';

// Chunker service
export {
  chunkText,
  chunkTextFixed,
  estimateChunkCount,
} from './chunker.service';

// Vector service
export {
  upsertDocumentVectors,
  deleteDocumentVectors,
  fetchVectors,
  getVectorStats,
  parseVectorId,
} from './vector.service';

// Search service
export {
  searchDocuments,
  buildContextFromResults,
  extractSourceReferences,
  hasDocuments,
  searchWithFilters,
} from './search.service';

// Chat service
export {
  generateChatResponse,
  generateSessionTitle,
  getAvailableModels,
} from './chat.service';
