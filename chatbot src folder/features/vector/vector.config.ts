/**
 * Vector Feature Configuration
 *
 * Centralized configuration for all vector-related services and operations.
 * This file consolidates all hardcoded values for easy editing and testing.
 */

import { VectorConfig } from '../../interfaces/config.interface';

/**
 * Default Vector Configuration
 * Production-ready settings optimized for ChatVerse
 */
export const defaultVectorConfig: VectorConfig = {
  // ========================
  // CHUNKING CONFIGURATIONS
  // ========================
  chunking: {
    // Strategy settings
    defaultStrategy: 'semantic',
    availableStrategies: ['semantic', 'fixed', 'hierarchical', 'content-aware'],

    // Size configurations - optimized for BGE-M3
    minChunkSize: 400,
    maxChunkSize: 1200,
    targetChunkSize: 800, // Sweet spot for semantic coherence

    // Overlap settings
    enableOverlap: true,
    overlapPercentage: 25,
    sentenceOverlapEnabled: true,

    // Research project preservation
    preserveResearchProjects: true,
    researchProjectNames: [], // Can be configured per agent

    // Semantic boundary detection
    enhanceSemanticBoundaries: true,
    technicalKeywords: ['technology', 'specifications', 'features', 'architecture', 'system'],
    factTypeKeywords: {
      company: ['founded', 'company', 'established', 'incorporated', 'headquarters'],
      technical: ['technology', 'specifications', 'features', 'architecture', 'system', 'platform'],
      people: ['ceo', 'founder', 'chief', 'executive', 'director', 'team'],
      product: ['product', 'service', 'solution', 'platform', 'application']
    },

    // Content transitions for semantic boundaries
    contentTransitions: {
      overviewToResearch: ['overview', 'introduction', 'about', 'background'],
      researchToProducts: ['research', 'development', 'projects', 'products', 'solutions']
    },

    // Advanced chunking options
    enableHierarchical: false, // Enable for complex documents
    enableContentAware: false, // Enable for mixed content types
    hierarchicalSummarySize: 300,

    // Content-aware chunking thresholds
    contentTypeThresholds: {
      technicalContentMin: 0.6, // 60% technical keywords = technical content
      narrativeContentMax: 0.3  // 30% technical keywords = narrative content
    },

    // Size adjustment multipliers for content-aware chunking
    technicalSizeMultiplier: 0.8,    // Size multiplier for technical content
    listSizeMultiplier: 0.6,         // Size multiplier for list content
    narrativeSizeMultiplier: 1.2,    // Size multiplier for narrative content
    maxChunkSizeMultiplier: 1.5,     // Emergency chunk size limit multiplier

    // Hierarchical chunking parameters
    summarySizeRatio: 0.3,           // Ratio of chunk length for summary
    minSummaryRatio: 0.5,            // Minimum summary size ratio
  },

  // ========================
  // EMBEDDING CONFIGURATIONS
  // ========================
  embedding: {
    // Model settings
    modelName: 'BAAI/bge-m3',
    dimensions: 1024,
    provider: 'HuggingFace',

    // Processing limits
    maxBatchSize: 15, // Increased from 10 for better performance
    maxTextLength: 8192,
    chunkSize: 4000,
    chunkOverlap: 500,

    // Retry and rate limiting
    retryAttempts: 3,
    retryDelay: 1000,
    rateLimitDelay: 100,

    // Processing parameters
    sentenceSearchRange: 200,         // Character range for sentence boundary search
  },

  // ========================
  // SEARCH CONFIGURATIONS (Now in global search config)
  // ========================
  // Search settings moved to src/config/search.config.ts
  // Access via: searchConfig.parameters, searchConfig.hybrid, searchConfig.layers.vector

  // ========================
  // RERANKING CONFIGURATIONS (Now in global search config)
  // ========================
  // Reranking settings moved to src/config/search.config.ts
  // Access via: searchConfig.reranking

  // ========================
  // CACHE CONFIGURATIONS (Now in global cache config)
  // ========================
  // Cache settings moved to src/config/cache.config.ts
  // Access via: cacheConfig.vector.search, cacheConfig.vector.statistics

  // ========================
  // STATISTICS CONFIGURATIONS (Now in global cache config)
  // ========================
  // Statistics settings moved to src/config/cache.config.ts
  // Access via: cacheConfig.vector.statistics

  // ========================
  // VECTOR OPERATIONS
  // ========================
  operations: {
    // Batch processing
    maxBatchSize: 100,
    enableParallelProcessing: true,

    // Error handling
    maxRetries: 3,
    retryDelay: 1000,

    // Cleanup settings
    enableAutoCleanup: false,
    cleanupInterval: 3600 // 1 hour
  },

  // ========================
  // NAMESPACE CONFIGURATIONS
  // ========================
  namespace: {
    // Naming patterns
    userPrefix: 'user_',
    agentPrefix: 'agent_',
    separator: '_',

    // Isolation settings
    enableUserIsolation: true,
    enableAgentIsolation: true
  },

  // ========================
  // DOCUMENT CONTEXT
  // ========================
  documentContext: {
    // Extraction settings
    maxTitleLength: 100,
    maxSummaryLength: 150,
    maxSectionTitles: 10,

    // Content analysis
    enableWordCount: true,
    enableSectionDetection: true,

    // Preview and processing limits
    maxSummaryPreviewLength: 200,     // Preview length for content summaries
    maxTitleCandidateLength: 100,     // Maximum length for title candidates
    contextOverlapRange: 100,         // Character range for context overlap
  }
};

/**
 * Environment-specific configuration overrides
 */
export const getVectorConfig = (): VectorConfig => {
  const config = { ...defaultVectorConfig };

  // Environment-specific overrides can be added here
  if (process.env.NODE_ENV === 'development') {
    // Development-specific settings
    config.embedding.retryAttempts = 1; // Faster development cycles
  }

  if (process.env.NODE_ENV === 'test') {
    // Test-specific settings
    config.embedding.retryAttempts = 1; // Faster tests
  }

  return config;
};

/**
 * Export the active configuration
 */
export const vectorConfig = getVectorConfig();