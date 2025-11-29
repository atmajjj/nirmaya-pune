/**
 * Global Search & Reranking Configuration
 *
 * Centralized configuration for all search and reranking operations.
 * Consolidates search parameters, reranking settings, and similarity thresholds
 * from both chat and vector features with resolved layer conflicts.
 */

import { SearchConfig } from '../interfaces/config.interface';

/**
 * Default Global Search Configuration
 * Production-ready settings with resolved layer conflicts
 */
export const defaultSearchConfig: SearchConfig = {
  // ========================
  // GLOBAL SEARCH SETTINGS
  // ========================
  global: {
    enableSearch: true,
    defaultStrategy: 'pinecone_hybrid',
    minQueryLength: 10,
  },

  // ========================
  // CORE SEARCH PARAMETERS
  // ========================
  parameters: {
    // Basic search settings - unified values
    defaultTopK: 10,
    maxTopK: 50,
    minTopK: 20,

    // Similarity and relevance - unified values
    minSimilarityThreshold: 0.1,
    defaultMinSimilarity: 0.15,

    // Caching and performance - unified values
    enableCacheByDefault: true,
    includeMetadataByDefault: true,
    prioritizeSpeed: false,
  },

  // ========================
  // HYBRID SEARCH CONFIGURATION
  // ========================
  hybrid: {
    defaultDenseWeight: 0.7,
    defaultSparseWeight: 0.3,
    fallbackDenseWeight: 0.9,
    fallbackSparseWeight: 0.1,
    hybridTopKMultiplier: 1.5,
    keywordScorePenalty: 0.5,
    sparseFallbackPenalty: 0.8,
  },

  // ========================
  // RERANKING CONFIGURATION
  // ========================
  reranking: {
    // Model settings
    defaultModel: 'BAAI/bge-m3',
    availableModels: {
      bgeM3: 'BAAI/bge-m3',
      bgeReranker: 'bge-reranker-v2-m3'
    },

    // Core reranking parameters - unified values
    enableByDefault: false, // DISABLED: Reranking was causing correct chunks to be demoted
    scoreThreshold: 0.3,
    maxCandidates: 20,
    defaultTopN: 10,

    // Performance settings
    includeOriginalScores: false,
    enableFallback: true,

    // Scoring weights for combined relevance calculation
    relevanceScoreWeight: 0.7,
    originalScoreWeight: 0.3,
    overlapWeight: 0.7,
    lengthBonusWeight: 0.3,
    termOverlapWeight: 0.7,
    lengthFactorWeight: 0.3,

    // Fallback scores for error handling
    fallbackScoreNoQueryWords: 0.1,
    fallbackScoreError: 0.5,
  },

  // ========================
  // LAYER-SPECIFIC OVERRIDES
  // ========================
  layers: {
    // Chat layer specific settings
    chat: {
      context: {
        maxContextChars: 3200, // Optimized from 4000 for faster responses while maintaining quality
        previewMaxChars: 1200,
        textPreviewLength: 200,
        maxResultsToUse: 10, // Increased from 5 to use more search results
        rerankedUseTopN: 5,
      },
      vectorSearch: {
        topK: 25, // Optimized from 30 for faster processing with maintained accuracy
        minSimilarity: 0.18, // Slightly increased from 0.15 to reduce irrelevant results
        rerankTopN: 10,
        rerankThreshold: 0.35,
        enableCache: true,
      },
    },

    // Vector layer specific settings
    vector: {
      supportedSourceTypes: ['file', 'text', 'website', 'database', 'qa'],
      supportedStrategies: ['semantic', 'fixed', 'hierarchical', 'content-aware'],
    },
  },
};

/**
 * Environment-specific search configuration overrides
 */
export const getSearchConfig = (): SearchConfig => {
  const config = { ...defaultSearchConfig };

  // Environment-specific overrides
  if (process.env.NODE_ENV === 'development') {
    // Development-specific settings
    config.global.enableSearch = true;
    config.parameters.enableCacheByDefault = true;
  }

  if (process.env.NODE_ENV === 'test') {
    // Test-specific settings - minimize search for faster tests
    config.parameters.enableCacheByDefault = false;
    config.reranking.enableByDefault = false;
    config.parameters.defaultTopK = 5; // Smaller result sets for tests
  }

  if (process.env.NODE_ENV === 'production') {
    // Production optimizations
    config.parameters.prioritizeSpeed = true;
    config.reranking.enableByDefault = false; // Keep disabled for production stability
  }

  return config;
};

/**
 * Export the active search configuration
 */
export const searchConfig = getSearchConfig();

/**
 * Utility functions for search configuration
 */
export const searchUtils = {
  /**
   * Get search parameters for a specific layer
   */
  getLayerParams: (layer: 'chat' | 'vector') => {
    const config = searchConfig;

    if (layer === 'chat') {
      return {
        ...config.parameters,
        ...config.layers.chat.vectorSearch,
      };
    }

    return {
      ...config.parameters,
      supportedSourceTypes: config.layers.vector.supportedSourceTypes,
      supportedStrategies: config.layers.vector.supportedStrategies,
    };
  },

  /**
   * Check if reranking is enabled for a layer
   */
  isRerankingEnabled: (layer: 'chat' | 'vector' = 'chat'): boolean => {
    const config = searchConfig;

    if (layer === 'chat') {
      return config.reranking.enableByDefault;
    }

    return config.reranking.enableByDefault;
  },

  /**
   * Get reranking configuration
   */
  getRerankingConfig: () => {
    return searchConfig.reranking;
  },

  /**
   * Get hybrid search weights
   */
  getHybridWeights: (fallback: boolean = false) => {
    const config = searchConfig.hybrid;

    if (fallback) {
      return {
        dense: config.fallbackDenseWeight,
        sparse: config.fallbackSparseWeight,
      };
    }

    return {
      dense: config.defaultDenseWeight,
      sparse: config.defaultSparseWeight,
    };
  },

  /**
   * Validate search parameters
   */
  validateParams: (params: { topK?: number; minSimilarity?: number }) => {
    const config = searchConfig;

    if (params.topK !== undefined) {
      if (params.topK < config.parameters.minTopK || params.topK > config.parameters.maxTopK) {
        throw new Error(`topK must be between ${config.parameters.minTopK} and ${config.parameters.maxTopK}`);
      }
    }

    if (params.minSimilarity !== undefined) {
      if (params.minSimilarity < config.parameters.minSimilarityThreshold) {
        throw new Error(`minSimilarity must be at least ${config.parameters.minSimilarityThreshold}`);
      }
    }

    return true;
  },
};