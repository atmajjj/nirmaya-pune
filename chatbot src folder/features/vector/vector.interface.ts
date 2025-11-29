export interface IVectorRecord {
  _id: string;
  text: string;
  category?: string;
  // Semantic chunking metadata
  sourceId?: number;
  sourceType?: string;
  chunkIndex?: number;
  totalChunks?: number;
  breakpointScore?: number;
  similarity?: number;
  chunkingStrategy?: string;
  startPosition?: number;
  endPosition?: number;
  processingTimeMs?: number;
  // Content quality metadata
  chunkQuality?: number; // 0-1 quality score for this chunk
  chunkDensity?: number; // Information density score
  chunkPosition?: 'start' | 'middle' | 'end'; // Position in document
  contentFreshness?: number; // Days since source creation
  contentAuthority?: number; // Source credibility score
  contentRelevance?: number; // Pre-computed relevance hints
  // Chunk overlap metadata
  hasOverlapPrefix?: boolean; // Whether chunk has prefix overlap
  overlapPrefixLength?: number; // Length of prefix overlap in characters
  hasOverlapSuffix?: boolean; // Whether chunk has suffix overlap
  overlapSuffixLength?: number; // Length of suffix overlap in characters
  overlapScore?: number; // Semantic coherence score of overlap (0-1)
  overlapStrategy?: string; // Strategy used for overlap ('sentence', 'word', 'semantic')
  // Contextual chunk enhancement metadata (flattened for Pinecone compatibility)
  documentTitle?: string;
  documentSummary?: string;
  sectionTitle?: string;
  precedingContext?: string;
  followingContext?: string;
  // Flattened document metadata fields (Pinecone requires primitive types)
  documentFileType?: string;
  documentLanguage?: string;
  documentWordCount?: number;
  documentCreatedDate?: string;
  // Source timestamp metadata for freshness tracking
  sourceCreatedAt?: string; // ISO string format for source creation
  sourceUpdatedAt?: string; // ISO string format for source last update
  sourceName?: string; // Source name for better context
  sourceDescription?: string; // Source description if available
  sourceStatus?: string; // Source status (pending, processing, completed, failed)
  sourceFileSize?: number; // For file sources - file size in bytes
  sourceUrl?: string; // For website sources - URL
}

export interface ISearchVectorsInput {
  query: string;
  // Enhanced search options for semantic chunks
  includeMetadata?: boolean;
  filterByStrategy?: string;
  minSimilarity?: number;
  maxChunks?: number;
}

export interface IVectorSearchResult {
  id: string;
  text: string;
  score: number;
  // Enhanced metadata for semantic chunks and reranking
  metadata?: {
    category?: string;
    sourceId?: number;
    sourceType?: string;
    chunkIndex?: number;
    totalChunks?: number;
    breakpointScore?: number;
    similarity?: number;
    chunkingStrategy?: string;
    startPosition?: number;
    endPosition?: number;
    // Content quality metadata
    chunkQuality?: number;
    chunkDensity?: number;
    chunkPosition?: string;
    contentFreshness?: number;
    contentAuthority?: number;
    contentRelevance?: number;
    // Chunk overlap metadata
    hasOverlapPrefix?: boolean;
    overlapPrefixLength?: number;
    hasOverlapSuffix?: boolean;
    overlapSuffixLength?: number;
    overlapScore?: number;
    overlapStrategy?: string;
    // Contextual enhancement metadata (flattened)
    documentTitle?: string;
    documentSummary?: string;
    sectionTitle?: string;
    precedingContext?: string;
    followingContext?: string;
    documentFileType?: string;
    documentLanguage?: string;
    documentWordCount?: number;
    documentCreatedDate?: string;
    // Source timestamp metadata for freshness tracking
    sourceCreatedAt?: string;
    sourceName?: string;
    sourceUpdatedAt?: string;
    sourceDescription?: string;
    sourceStatus?: string;
    sourceFileSize?: number;
    sourceUrl?: string;
    // Reranking metadata
    originalScore?: number;
    rerankModel?: string;
    rerankScore?: number;
    // Hybrid search metadata
    hybridInfo?: {
      denseScore: number;
      sparseScore: number;
      denseWeight: number;
      sparseWeight: number;
      sources: string[];
      fallbackMode?: boolean;
    };
    rerankInfo?: {
      originalScore: number;
      rerankScore: number;
      model: string;
    };
    // Additional metadata for enhanced hybrid search
    keywordScore?: number;
    keywordMatches?: number;
    scoringInfo?: {
      finalScore: number;
      originalSemanticScore: number;
      keywordScore: number;
      keywordMatches: number;
      hybridRank: number;
      scoringMethod: string;
      boostFactor?: number;
      originalScore?: number;
    };
  };
}
