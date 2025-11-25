/**
 * JWT Token Blacklist Utility
 * Uses Redis for storing blacklisted tokens after logout
 * Tokens are automatically removed when they expire
 */

import { redisClient } from './redis';
import { logger } from './logger';

/** Prefix for blacklisted token keys in Redis */
const BLACKLIST_PREFIX = 'token:blacklist:';

/**
 * Add a token to the blacklist
 * @param token - JWT token to blacklist
 * @param expiresIn - Time in seconds until token expires (for Redis TTL)
 */
export async function blacklistToken(token: string, expiresIn: number): Promise<boolean> {
  try {
    // Use token hash as key to avoid storing full token
    const tokenHash = Buffer.from(token).toString('base64').slice(0, 32);
    const key = `${BLACKLIST_PREFIX}${tokenHash}`;

    // Store with expiration matching token expiry
    await redisClient.setEx(key, expiresIn, 'blacklisted');

    logger.info('Token blacklisted successfully', { 
      tokenHash: tokenHash.slice(0, 8) + '...',
      expiresIn 
    });

    return true;
  } catch (error) {
    logger.error('Failed to blacklist token:', {
      error: error instanceof Error ? error.message : String(error),
    });
    // Don't throw - logout should succeed even if Redis fails
    return false;
  }
}

/**
 * Check if a token is blacklisted
 * @param token - JWT token to check
 * @returns true if token is blacklisted, false otherwise
 */
export async function isTokenBlacklisted(token: string): Promise<boolean> {
  try {
    const tokenHash = Buffer.from(token).toString('base64').slice(0, 32);
    const key = `${BLACKLIST_PREFIX}${tokenHash}`;

    const result = await redisClient.get(key);
    return result !== null;
  } catch (error) {
    logger.error('Failed to check token blacklist:', {
      error: error instanceof Error ? error.message : String(error),
    });
    // On Redis error, allow token (fail open) to prevent lockout
    // In high-security scenarios, you might want to fail closed instead
    return false;
  }
}

/**
 * Calculate remaining seconds until token expiration from JWT payload
 * @param exp - JWT expiration timestamp (in seconds)
 * @returns Seconds until expiration, minimum 1 second
 */
export function getTokenTTL(exp: number): number {
  const now = Math.floor(Date.now() / 1000);
  const ttl = exp - now;
  return Math.max(ttl, 1); // Minimum 1 second TTL
}
