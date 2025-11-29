import Redis from "ioredis";
import { logger } from "./logger";

// Redis configuration from environment variables
const redisConfig = {
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: null,
  retryDelayOnFailover: 100,
  enableReadyCheck: false,
};

// Create Redis client instance
export const redisClient = new Redis(redisConfig);

// Handle Redis connection events
redisClient.on("connect", () => {
  logger.info("✅ Connected to Redis successfully");
});

redisClient.on("error", (error) => {
  logger.error("❌ Redis connection error:", error);
});

redisClient.on("ready", () => {
  logger.info("✅ Redis client is ready");
});

redisClient.on("close", () => {
  logger.warn("⚠️ Redis connection closed");
});

// Test Redis connectivity on startup
export const initializeRedisConnection = async (): Promise<boolean> => {
  try {
    logger.info(
      `🔄 Testing Redis connection to ${redisConfig.host}:${redisConfig.port}...`
    );
    const result = await redisClient.ping();
    logger.info(`✅ Redis connection test passed: ${result}`);
    return true;
  } catch (error) {
    logger.error("❌ Redis connection test failed:", error);
    return false;
  }
};

// Test Redis connectivity (for manual testing)
export const testRedisConnection = async (): Promise<boolean> => {
  try {
    const result = await redisClient.ping();
    logger.info("✅ Redis ping successful:", result);
    return true;
  } catch (error) {
    logger.error("❌ Redis ping failed:", error);
    return false;
  }
};

// Graceful shutdown
export const closeRedisConnection = async (): Promise<void> => {
  try {
    await redisClient.quit();
    logger.info("✅ Redis connection closed gracefully");
  } catch (error) {
    logger.error("❌ Error closing Redis connection:", error);
  }
};

export default redisClient;
