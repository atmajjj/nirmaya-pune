import { CacheNamespace } from '../interfaces/config.interface';

/**
 * Legacy Cache Configuration (from cache-config.ts)
 * Basic cache configuration for SmartCacheService operations
 */
export const CACHE_CONFIG = {
  // TTL (Time To Live) in milliseconds
  TTL: {
    AGENT: 5 * 60 * 1000, // 5 minutes - agents change rarely
    API_KEY: 5 * 60 * 1000, // 5 minutes - API keys change rarely but need security consideration
    CONVERSATION_SUMMARY: 30 * 60 * 1000, // 30 minutes - conversation summaries are relatively stable
    CONTEXT: 2 * 60 * 1000, // 2 minutes - context should be relatively fresh
    SESSION_MESSAGES: 3 * 60 * 1000, // 3 minutes - messages are relatively stable
    VECTOR_AVAILABILITY: 2 * 60 * 1000, // 2 minutes - vector availability check
    EMBEDDING: 30 * 60 * 1000, // 30 minutes - embeddings are immutable
    PINECONE_HYBRID: 5 * 60 * 1000, // 5 minutes - hybrid search results
  },

  // Memory cache size limits (L1 cache)
  SIZE_LIMITS: {
    AGENT: 100, // Max 100 agents in memory
    API_KEY: 50, // Max 50 decrypted API keys in memory (security consideration)
    CONVERSATION_SUMMARY: 50, // Max 50 conversation summaries in memory
    CONTEXT: 50, // Max 50 context results in memory
    SESSION_MESSAGES: 100, // Max 100 session message sets in memory
    VECTOR_AVAILABILITY: 50, // Max 50 availability checks in memory
    PINECONE_HYBRID: 30, // Max 30 hybrid search results in memory
  },

  // Cache key prefixes for Redis (L2 cache)
  KEY_PREFIXES: {
    AGENT: "agent:",
    API_KEY: "api_key:",
    CONVERSATION_SUMMARY: "conv_summary:",
    CONTEXT: "context:",
    SESSION_MESSAGES: "session_messages:",
    VECTOR_AVAILABILITY: "vector_avail:",
    EMBEDDING: "embedding:",
    PINECONE_HYBRID: "pinecone_hybrid:",
  },

  // Feature flags
  FEATURES: {
    ENABLE_L1_CACHE: true, // Memory cache
    ENABLE_L2_CACHE: true, // Redis cache
    ENABLE_CACHE_STATS: true, // Statistics tracking
    ENABLE_CACHE_WARMING: false, // Pre-load cache (will enable in Step 10)
  },
} as const;

/**
 * Get TTL for a cache namespace (milliseconds)
 */
export function getTTL(namespace: CacheNamespace): number {
  const ttlMap: Record<CacheNamespace, number> = {
    agent: CACHE_CONFIG.TTL.AGENT,
    api_key: CACHE_CONFIG.TTL.API_KEY,
    conversation_summary: CACHE_CONFIG.TTL.CONVERSATION_SUMMARY,
    context: CACHE_CONFIG.TTL.CONTEXT,
    session_messages: CACHE_CONFIG.TTL.SESSION_MESSAGES,
    vector_availability: CACHE_CONFIG.TTL.VECTOR_AVAILABILITY,
    embedding: CACHE_CONFIG.TTL.EMBEDDING,
    pinecone_hybrid: CACHE_CONFIG.TTL.PINECONE_HYBRID,
  };
  return ttlMap[namespace];
}

/**
 * Get size limit for a cache namespace
 */
export function getSizeLimit(namespace: CacheNamespace): number {
  const sizeMap: Record<CacheNamespace, number> = {
    agent: CACHE_CONFIG.SIZE_LIMITS.AGENT,
    api_key: CACHE_CONFIG.SIZE_LIMITS.API_KEY,
    conversation_summary: CACHE_CONFIG.SIZE_LIMITS.CONVERSATION_SUMMARY,
    context: CACHE_CONFIG.SIZE_LIMITS.CONTEXT,
    session_messages: CACHE_CONFIG.SIZE_LIMITS.SESSION_MESSAGES,
    vector_availability: CACHE_CONFIG.SIZE_LIMITS.VECTOR_AVAILABILITY,
    embedding: 0, // No size limit for embeddings (managed by TTL only)
    pinecone_hybrid: CACHE_CONFIG.SIZE_LIMITS.PINECONE_HYBRID,
  };
  return sizeMap[namespace];
}

/**
 * Get key prefix for a cache namespace
 */
export function getKeyPrefix(namespace: CacheNamespace): string {
  const prefixMap: Record<CacheNamespace, string> = {
    agent: CACHE_CONFIG.KEY_PREFIXES.AGENT,
    api_key: CACHE_CONFIG.KEY_PREFIXES.API_KEY,
    conversation_summary: CACHE_CONFIG.KEY_PREFIXES.CONVERSATION_SUMMARY,
    context: CACHE_CONFIG.KEY_PREFIXES.CONTEXT,
    session_messages: CACHE_CONFIG.KEY_PREFIXES.SESSION_MESSAGES,
    vector_availability: CACHE_CONFIG.KEY_PREFIXES.VECTOR_AVAILABILITY,
    embedding: CACHE_CONFIG.KEY_PREFIXES.EMBEDDING,
    pinecone_hybrid: CACHE_CONFIG.KEY_PREFIXES.PINECONE_HYBRID,
  };
  return prefixMap[namespace];
}