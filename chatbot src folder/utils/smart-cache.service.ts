import { redisClient } from "./redis";
import { logger } from "./logger";
import { CacheNamespace } from "../interfaces/config.interface";
import {
  getTTL,
  getSizeLimit,
  getKeyPrefix,
  CACHE_CONFIG,
} from "../config/smart-cache.config";
import crypto from "crypto";

/**
 * Cache entry with metadata
 */
interface CacheEntry<T> {
  value: T;
  timestamp: number;
  ttl: number;
}

/**
 * Smart Cache Service with two-tier caching (Memory + Redis)
 * L1 Cache: In-memory Map for ultra-fast access
 * L2 Cache: Redis for persistence and cross-instance sharing
 */
export class SmartCacheService {
  private namespace: CacheNamespace;
  private l1Cache: Map<string, CacheEntry<any>>;
  private sizeLimit: number;
  private defaultTTL: number;
  private keyPrefix: string;

  constructor(namespace: CacheNamespace) {
    this.namespace = namespace;
    this.l1Cache = new Map();
    this.sizeLimit = getSizeLimit(namespace);
    this.defaultTTL = getTTL(namespace);
    this.keyPrefix = getKeyPrefix(namespace);
  }

  /**
   * Generate cache key with namespace prefix
   */
  private getCacheKey(key: string): string {
    return `${this.keyPrefix}${key}`;
  }

  /**
   * Generate hash for complex keys (e.g., query + userId + agentId)
   */
  public static hashKey(...parts: (string | number)[]): string {
    const combined = parts.join(":");
    return crypto.createHash("md5").update(combined).digest("hex");
  }

  /**
   * Get value from cache (L1 -> L2 -> null)
   */
  public async get<T>(key: string): Promise<T | null> {
    const cacheKey = this.getCacheKey(key);

    try {
      // Try L1 cache (memory) first
      if (CACHE_CONFIG.FEATURES.ENABLE_L1_CACHE) {
        const l1Entry = this.l1Cache.get(cacheKey);
        if (l1Entry) {
          const now = Date.now();
          const age = now - l1Entry.timestamp;

          // Check if still valid
          if (age < l1Entry.ttl) {
            logger.debug(
              `✅ L1 Cache HIT: ${this.namespace}:${key} (age: ${age}ms)`
            );
            return l1Entry.value as T;
          } else {
            // Expired, remove from L1
            this.l1Cache.delete(cacheKey);
            logger.debug(`⏰ L1 Cache EXPIRED: ${this.namespace}:${key}`);
          }
        }
      }

      // Try L2 cache (Redis) if L1 miss
      if (CACHE_CONFIG.FEATURES.ENABLE_L2_CACHE) {
        const l2Value = await redisClient.get(cacheKey);
        if (l2Value) {
          const parsedValue = JSON.parse(l2Value) as T;
          logger.debug(`✅ L2 Cache HIT: ${this.namespace}:${key}`);

          // Promote to L1 cache
          if (CACHE_CONFIG.FEATURES.ENABLE_L1_CACHE) {
            this.setL1(cacheKey, parsedValue, this.defaultTTL);
          }

          return parsedValue;
        }
      }

      logger.debug(`❌ Cache MISS: ${this.namespace}:${key}`);
      return null;
    } catch (error) {
      logger.error(`Cache GET error for ${this.namespace}:${key}:`, error);
      return null; // Graceful degradation
    }
  }

  /**
   * Set value in cache (L1 + L2)
   */
  public async set<T>(
    key: string,
    value: T,
    ttl: number = this.defaultTTL
  ): Promise<void> {
    const cacheKey = this.getCacheKey(key);

    try {
      // Set in L1 cache (memory)
      if (CACHE_CONFIG.FEATURES.ENABLE_L1_CACHE) {
        this.setL1(cacheKey, value, ttl);
      }

      // Set in L2 cache (Redis)
      if (CACHE_CONFIG.FEATURES.ENABLE_L2_CACHE) {
        const ttlSeconds = Math.ceil(ttl / 1000);
        await redisClient.setex(
          cacheKey,
          ttlSeconds,
          JSON.stringify(value)
        );
        logger.debug(
          `💾 Cache SET: ${this.namespace}:${key} (TTL: ${ttlSeconds}s)`
        );
      }
    } catch (error) {
      logger.error(`Cache SET error for ${this.namespace}:${key}:`, error);
      // Don't throw - caching is optional
    }
  }

  /**
   * Set value in L1 cache with size limit management
   */
  private setL1<T>(cacheKey: string, value: T, ttl: number): void {
    // Check size limit and evict oldest if needed
    if (this.sizeLimit > 0 && this.l1Cache.size >= this.sizeLimit) {
      this.evictOldest();
    }

    this.l1Cache.set(cacheKey, {
      value,
      timestamp: Date.now(),
      ttl,
    });
  }

  /**
   * Evict oldest entry from L1 cache (LRU)
   */
  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTimestamp = Date.now();

    for (const [key, entry] of this.l1Cache.entries()) {
      if (entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.l1Cache.delete(oldestKey);
      logger.debug(`🗑️  L1 Cache EVICT: ${oldestKey}`);
    }
  }

  /**
   * Delete value from cache (L1 + L2)
   */
  public async delete(key: string): Promise<void> {
    const cacheKey = this.getCacheKey(key);

    try {
      // Delete from L1
      if (CACHE_CONFIG.FEATURES.ENABLE_L1_CACHE) {
        this.l1Cache.delete(cacheKey);
      }

      // Delete from L2
      if (CACHE_CONFIG.FEATURES.ENABLE_L2_CACHE) {
        await redisClient.del(cacheKey);
      }

      logger.debug(`🗑️  Cache DELETE: ${this.namespace}:${key}`);
    } catch (error) {
      logger.error(`Cache DELETE error for ${this.namespace}:${key}:`, error);
    }
  }

  /**
   * Delete multiple keys matching a pattern (wildcards supported)
   */
  public async deletePattern(pattern: string): Promise<void> {
    const fullPattern = this.getCacheKey(pattern);

    try {
      // Clear matching keys from L1
      if (CACHE_CONFIG.FEATURES.ENABLE_L1_CACHE) {
        const keysToDelete: string[] = [];
        for (const key of this.l1Cache.keys()) {
          if (this.matchPattern(key, fullPattern)) {
            keysToDelete.push(key);
          }
        }
        keysToDelete.forEach((key) => this.l1Cache.delete(key));
      }

      // Clear matching keys from L2
      if (CACHE_CONFIG.FEATURES.ENABLE_L2_CACHE) {
        const keys = await redisClient.keys(fullPattern);
        if (keys.length > 0) {
          await redisClient.del(...keys);
        }
      }

      logger.debug(`🗑️  Cache DELETE PATTERN: ${this.namespace}:${pattern}`);
    } catch (error) {
      logger.error(
        `Cache DELETE PATTERN error for ${this.namespace}:${pattern}:`,
        error
      );
    }
  }

  /**
   * Simple pattern matching (supports * wildcard)
   */
  private matchPattern(str: string, pattern: string): boolean {
    const regexPattern = pattern
      .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
      .replace(/\*/g, ".*");
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(str);
  }

  /**
   * Clear all cache entries for this namespace
   */
  public async clear(): Promise<void> {
    try {
      // Clear L1
      if (CACHE_CONFIG.FEATURES.ENABLE_L1_CACHE) {
        this.l1Cache.clear();
      }

      // Clear L2
      if (CACHE_CONFIG.FEATURES.ENABLE_L2_CACHE) {
        const keys = await redisClient.keys(`${this.keyPrefix}*`);
        if (keys.length > 0) {
          await redisClient.del(...keys);
        }
      }

      logger.info(`🧹 Cache CLEARED: ${this.namespace}`);
    } catch (error) {
      logger.error(`Cache CLEAR error for ${this.namespace}:`, error);
    }
  }

  /**
   * Get cache statistics
   */
  public getStats(): {
    namespace: string;
    l1Size: number;
    sizeLimit: number;
    defaultTTL: number;
  } {
    return {
      namespace: this.namespace,
      l1Size: this.l1Cache.size,
      sizeLimit: this.sizeLimit,
      defaultTTL: this.defaultTTL,
    };
  }

  /**
   * Get or set pattern: If cache miss, execute callback and cache result
   */
  public async getOrSet<T>(
    key: string,
    callback: () => Promise<T>,
    ttl: number = this.defaultTTL
  ): Promise<T> {
    // Try to get from cache
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Cache miss - execute callback
    const value = await callback();

    // Cache the result
    await this.set(key, value, ttl);

    return value;
  }
}
