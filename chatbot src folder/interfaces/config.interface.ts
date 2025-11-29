/**
 * Configuration Interfaces
 *
 * Centralized interfaces for all configuration modules.
 * Keep this file minimal - only interfaces and types.
 */

export interface CacheConfig {
  global: {
    enableCache: boolean;
    defaultTTL: number;
  };
  chat: {
    responseCache: {
      enableCache: boolean;
      ttl: number;
      namespace: string;
      minQueryLength: number;
      minResponseLength: number;
      personalizationIndicators: string[];
      enableQueryNormalization: boolean;
    };
    analytics: {
      enableCache: boolean;
      ttl: number;
    };
  };
  vector: {
    search: {
      enableCache: boolean;
      searchResultsTTL: number;
      rerankedResultsTTL: number;
      hybridResultsTTL: number;
    };
    statistics: {
      enableCache: boolean;
      vectorCountTTL: number;
      vectorAvailabilityTTL: number;
      indexStatsTTL: number;
    };
    prefixes: {
      search: string;
      reranked: string;
      vectorCount: string;
      vectorAvailability: string;
      indexStats: string;
      hybrid: string;
    };
  };
  conversation: {
    summary: {
      enableCache: boolean;
      ttl: number;
      namespace: string;
    };
  };
}

export type CacheNamespace =
  | "agent"
  | "api_key"
  | "conversation_summary"
  | "context"
  | "session_messages"
  | "vector_availability"
  | "embedding"
  | "pinecone_hybrid";

export interface SearchConfig {
  global: {
    enableSearch: boolean;
    defaultStrategy: 'semantic' | 'hybrid' | 'pinecone_hybrid';
    minQueryLength: number;
  };
  parameters: {
    defaultTopK: number;
    maxTopK: number;
    minTopK: number;
    minSimilarityThreshold: number;
    defaultMinSimilarity: number;
    enableCacheByDefault: boolean;
    includeMetadataByDefault: boolean;
    prioritizeSpeed: boolean;
  };
  hybrid: {
    defaultDenseWeight: number;
    defaultSparseWeight: number;
    fallbackDenseWeight: number;
    fallbackSparseWeight: number;
    hybridTopKMultiplier: number;
    keywordScorePenalty: number;
    sparseFallbackPenalty: number;
  };
  reranking: {
    defaultModel: string;
    availableModels: {
      bgeM3: string;
      bgeReranker: string;
    };
    enableByDefault: boolean;
    scoreThreshold: number;
    maxCandidates: number;
    defaultTopN: number;
    includeOriginalScores: boolean;
    enableFallback: boolean;
    relevanceScoreWeight: number;
    originalScoreWeight: number;
    overlapWeight: number;
    lengthBonusWeight: number;
    termOverlapWeight: number;
    lengthFactorWeight: number;
    fallbackScoreNoQueryWords: number;
    fallbackScoreError: number;
  };
  layers: {
    chat: {
      context: {
        maxContextChars: number;
        previewMaxChars: number;
        textPreviewLength: number;
        maxResultsToUse: number;
        rerankedUseTopN: number;
      };
      vectorSearch: {
        topK: number;
        minSimilarity: number;
        rerankTopN: number;
        rerankThreshold: number;
        enableCache: boolean;
      };
    };
    vector: {
      supportedSourceTypes: string[];
      supportedStrategies: string[];
    };
  };
}

export interface ChatConfig {
  prompts: {
    defaultBasePrompt: string;
    fallbackSystemPrompt: string;
    directModelFallbackPrompt: string;
    noSourcesPrompt: string;
    enableSourceFirstBehavior: boolean;
    citationFormat: string;
    minPromptLength: number;
    requireContextMention: boolean;
    requireGreetingExceptions: boolean;
    availableTopicsMax?: number;
  };
  sourceGuard: {
    greetingPatterns: RegExp[];
    conversationalPatterns: RegExp[];
    generalKnowledgePatterns: RegExp[];
    generalKnowledgeDeclineMessage: string;
    enableDecisionLogging: boolean;
  };
  summarization: {
    messageCountThreshold: number;
    rollingWindowSize: number;
    maxTopics: number;
    topicPatterns: RegExp[];
    minTopicLength: number;
    maxTopicLength: number;
    contentPreviewLength: number;
    questionPreviewLength: number;
    answerPreviewLength: number;
    recentMessagesCount: number;
    cacheNamespace?: string;
  };
  aiProcessing: {
    defaultTemperature: number;
    minTemperature: number;
    maxTemperature: number;
    defaultMaxTokens: number;
    apiKeyPatterns: {
      openai: RegExp;
      anthropic: RegExp;
      groq: RegExp;
      google: RegExp;
    };
    invalidApiKeyMessages: {
      openai: string;
      anthropic: string;
      groq: string;
      google: string;
    };
    rateLimitMessage: string;
    generalRateLimitMessage: string;
    emptyResponseMessage: string;
  };
}

export interface VectorConfig {
  chunking: {
    defaultStrategy: 'semantic' | 'fixed' | 'hierarchical' | 'content-aware';
    availableStrategies: string[];
    minChunkSize: number;
    maxChunkSize: number;
    targetChunkSize: number;
    enableOverlap: boolean;
    overlapPercentage: number;
    sentenceOverlapEnabled: boolean;
    preserveResearchProjects: boolean;
    researchProjectNames: string[];
    enhanceSemanticBoundaries: boolean;
    technicalKeywords: string[];
    factTypeKeywords: {
      company: string[];
      technical: string[];
      people: string[];
      product: string[];
    };
    contentTransitions: {
      overviewToResearch: string[];
      researchToProducts: string[];
    };
    enableHierarchical: boolean;
    enableContentAware: boolean;
    hierarchicalSummarySize: number;
    contentTypeThresholds: {
      technicalContentMin: number;
      narrativeContentMax: number;
    };
    technicalSizeMultiplier: number;
    listSizeMultiplier: number;
    narrativeSizeMultiplier: number;
    maxChunkSizeMultiplier: number;
    summarySizeRatio: number;
    minSummaryRatio: number;
  };
  embedding: {
    modelName: string;
    dimensions: number;
    provider: string;
    maxBatchSize: number;
    maxTextLength: number;
    chunkSize: number;
    chunkOverlap: number;
    retryAttempts: number;
    retryDelay: number;
    rateLimitDelay: number;
    sentenceSearchRange: number;
  };
  operations: {
    maxBatchSize: number;
    enableParallelProcessing: boolean;
    maxRetries: number;
    retryDelay: number;
    enableAutoCleanup: boolean;
    cleanupInterval: number;
  };
  namespace: {
    userPrefix: string;
    agentPrefix: string;
    separator: string;
    enableUserIsolation: boolean;
    enableAgentIsolation: boolean;
  };
  documentContext: {
    maxTitleLength: number;
    maxSummaryLength: number;
    maxSectionTitles: number;
    enableWordCount: boolean;
    enableSectionDetection: boolean;
    maxSummaryPreviewLength: number;
    maxTitleCandidateLength: number;
    contextOverlapRange: number;
  };
}