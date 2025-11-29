/**
 * Feature Cache Configuration
 *
 * Modern feature-based cache configuration for chat, vector, and conversation features.
 * Provides structured caching with environment-specific overrides and utility functions.
 */

import { CacheConfig } from '../interfaces/config.interface';

/**
 * Default Global Cache Configuration
 * Production-ready settings with standardized TTL units (seconds)
 */
export const defaultCacheConfig: CacheConfig = {
  // ========================
  // GLOBAL CACHE SETTINGS
  // ========================
  global: {
    enableCache: true,
    defaultTTL: 300, // 5 minutes default
  },

  // ========================
  // CHAT FEATURE CACHES
  // ========================
  chat: {
    responseCache: {
      enableCache: true,
      ttl: 3600, // 1 hour (converted from 3600000ms)
      namespace: "chat_responses",
      minQueryLength: 20,
      minResponseLength: 20,
      personalizationIndicators: ['my ', 'i ', 'me ', 'mine', 'myself', 'personal'],
      enableQueryNormalization: true,
    },
    analytics: {
      enableCache: true,
      ttl: 300, // 5 minutes
    },
  },

  // ========================
  // VECTOR FEATURE CACHES
  // ========================
  vector: {
    search: {
      enableCache: true,
      searchResultsTTL: 300, // 5 minutes
      rerankedResultsTTL: 300, // 5 minutes
      hybridResultsTTL: 300, // 5 minutes
    },
    statistics: {
      enableCache: true,
      vectorCountTTL: 300, // 5 minutes
      vectorAvailabilityTTL: 120, // 2 minutes
      indexStatsTTL: 300, // 5 minutes
    },
    prefixes: {
      search: 'vector_search',
      reranked: 'vector_reranked',
      vectorCount: 'vector_count',
      vectorAvailability: 'vector_available',
      indexStats: 'vector_index_stats',
      hybrid: 'vector_hybrid'
    },
  },

  // ========================
  // CONVERSATION CACHES
  // ========================
  conversation: {
    summary: {
      enableCache: true,
      ttl: 1800, // 30 minutes
      namespace: "conversation_summary",
    },
  },
};

/**
 * Environment-specific cache configuration overrides
 */
export const getCacheConfig = (): CacheConfig => {
  const config = { ...defaultCacheConfig };

  // Environment-specific overrides
  if (process.env.NODE_ENV === 'development') {
    // Shorter cache TTLs for development
    config.global.defaultTTL = 60; // 1 minute
    config.chat.responseCache.ttl = 600; // 10 minutes
    config.vector.search.searchResultsTTL = 60; // 1 minute
  }

  if (process.env.NODE_ENV === 'test') {
    // Disable or minimize caching for tests
    config.global.enableCache = false;
    config.chat.responseCache.enableCache = false;
    config.chat.analytics.enableCache = false;
    config.vector.search.enableCache = false;
    config.vector.statistics.enableCache = false;
    config.conversation.summary.enableCache = false;
  }

  if (process.env.NODE_ENV === 'production') {
    // Optimized settings for production
    config.global.enableCache = true;
    // Keep default production settings
  }

  return config;
};

/**
 * Export the active cache configuration
 */
export const cacheConfig = getCacheConfig();

/**
 * Utility functions for cache configuration
 */
export const cacheUtils = {
  /**
   * Get TTL for a specific cache type
   */
  getTTL: (feature: keyof CacheConfig, subFeature?: string, type?: string): number => {
    const config = cacheConfig;

    switch (feature) {
      case 'chat':
        if (subFeature === 'response') {
          return config.chat.responseCache.ttl;
        }
        if (subFeature === 'analytics') {
          return config.chat.analytics.ttl;
        }
        break;
      case 'vector':
        if (subFeature === 'search') {
          if (type === 'reranked') return config.vector.search.rerankedResultsTTL;
          if (type === 'hybrid') return config.vector.search.hybridResultsTTL;
          return config.vector.search.searchResultsTTL;
        }
        if (subFeature === 'statistics') {
          if (type === 'availability') return config.vector.statistics.vectorAvailabilityTTL;
          if (type === 'index') return config.vector.statistics.indexStatsTTL;
          return config.vector.statistics.vectorCountTTL;
        }
        break;
      case 'conversation':
        if (subFeature === 'summary') {
          return config.conversation.summary.ttl;
        }
        break;
    }

    return config.global.defaultTTL;
  },

  /**
   * Check if caching is enabled for a feature
   */
  isEnabled: (feature: keyof CacheConfig, subFeature?: string): boolean => {
    if (!cacheConfig.global.enableCache) return false;

    const config = cacheConfig;

    switch (feature) {
      case 'chat':
        if (subFeature === 'response') return config.chat.responseCache.enableCache;
        if (subFeature === 'analytics') return config.chat.analytics.enableCache;
        break;
      case 'vector':
        if (subFeature === 'search') return config.vector.search.enableCache;
        if (subFeature === 'statistics') return config.vector.statistics.enableCache;
        break;
      case 'conversation':
        if (subFeature === 'summary') return config.conversation.summary.enableCache;
        break;
    }

    return true;
  },

  /**
   * Get cache key prefix for a feature
   */
  getPrefix: (feature: keyof CacheConfig, type?: string): string => {
    const config = cacheConfig;

    if (feature === 'vector' && config.vector.prefixes) {
      const prefixes = config.vector.prefixes;
      switch (type) {
        case 'search': return prefixes.search;
        case 'reranked': return prefixes.reranked;
        case 'vectorCount': return prefixes.vectorCount;
        case 'vectorAvailability': return prefixes.vectorAvailability;
        case 'indexStats': return prefixes.indexStats;
        case 'hybrid': return prefixes.hybrid;
      }
    }

    if (feature === 'chat') {
      if (type === 'response') return config.chat.responseCache.namespace;
      if (type === 'analytics') return 'chat_analytics';
    }

    if (feature === 'conversation' && type === 'summary') {
      return config.conversation.summary.namespace;
    }

    return `${feature}_cache`;
  },
};