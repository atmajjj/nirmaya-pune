import { createClient } from 'redis';
import { logger } from './logger';
import { config } from './validateEnv';

// Redis configuration from environment variables
const redisUrl = config.REDIS_URL || `redis://${config.REDIS_HOST}:${config.REDIS_PORT}`;

// Create Redis client instance with URL format
export const redisClient = createClient({
  url: redisUrl,
  password: config.REDIS_PASSWORD || undefined,
});

/** Track if Redis is connected and ready */
let isRedisConnected = false;

// Handle Redis connection events
redisClient.on('connect', () => {
  logger.info('✅ Connected to Redis successfully');
});

redisClient.on('error', error => {
  isRedisConnected = false;
  logger.error('❌ Redis connection error:', error);
});

redisClient.on('ready', () => {
  isRedisConnected = true;
  logger.info('✅ Redis client is ready');
});

redisClient.on('end', () => {
  isRedisConnected = false;
  logger.warn('⚠️ Redis connection closed');
});

/**
 * Check if Redis is currently connected
 */
export const isRedisReady = (): boolean => isRedisConnected && redisClient.isReady;

// Test Redis connectivity on startup
export const testRedisConnection = async (): Promise<boolean> => {
  try {
    const host = config.REDIS_HOST;
    const port = config.REDIS_PORT;
    logger.info(`🔄 Testing Redis connection to ${host}:${port}...`);
    
    if (!redisClient.isReady) {
      await redisClient.connect();
    }
    
    const result = await redisClient.ping();
    logger.info(`✅ Redis connection test passed: ${result}`);
    return true;
  } catch (error) {
    logger.error('❌ Redis connection test failed:', error);
    return false;
  }
};

export default redisClient;
