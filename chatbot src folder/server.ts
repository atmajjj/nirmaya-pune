import "reflect-metadata";
import App from "./app";
import { logger } from "./utils/logger";
import validateEnv from "./utils/validateEnv";
import ChatRoute from "./features/chat/chat.route";
import UserRoute from "./features/user/user.route";
import AgentRoute from "./features/agent/agent.route";
import BaseSourceRoute from "./features/source/source.route";
import FileSourceRoute from "./features/source/file/file-source.route";
import TextSourceRoute from "./features/source/text/text-source.route";
import WebsiteSourceRoute from "./features/source/website/website-source.route";
import DatabaseSourceRoute from "./features/source/database/database-source.route";
import QASourceRoute from "./features/source/qa/qa-source.route";
import VectorRoute from "./features/vector/vector.routes";
import { testDbConnection } from "./utils/testdbConnection";
import { ProviderModelRoute } from "./features/provider_model/provider-model.route";
import { initializeRedisConnection } from "./utils/redis";
import { initializePineconeConnection } from "./utils/pinecone";
import { startTrainingWorker } from "./features/train/training.worker";
import AnalyticsRoute from "./features/analytics/analytics.route";
import { gracefulShutdown } from "./utils/gracefulShutdown";

validateEnv();

async function bootstrap() {
  try {
    logger.info("🚀 Starting Chatverse Backend...");

    // Check DB connection
    await testDbConnection();

    // Initialize Redis connection (optional in Railway)
    try {
      const redisConnected = await initializeRedisConnection();
      if (!redisConnected) {
        logger.warn("⚠️ Redis connection failed, continuing without Redis...");
      }
    } catch (error) {
      logger.warn("⚠️ Redis not available, continuing without caching...");
    }

    // Initialize Pinecone connection (optional)
    try {
      const pineconeConnected = await initializePineconeConnection();
      if (!pineconeConnected) {
        logger.warn(
          "⚠️ Pinecone connection failed, vector features may be limited..."
        );
      }
    } catch (error) {
      logger.warn("⚠️ Pinecone not available, vector features disabled...");
    }

    // Start training worker for background job processing (optional)
    try {
      startTrainingWorker();
      logger.info("✅ Training worker started successfully");
    } catch (error) {
      logger.warn(
        "⚠️ Training worker failed to start, background jobs disabled..."
      );
    }

    // Start Express app
    const app = new App([
      new UserRoute(),
      new ChatRoute(),
      new AgentRoute(),
      new BaseSourceRoute(),
      new FileSourceRoute(),
      new TextSourceRoute(),
      new WebsiteSourceRoute(),
      new DatabaseSourceRoute(),
      new QASourceRoute(),
      new ProviderModelRoute(),
      new VectorRoute(),
      new AnalyticsRoute(),
    ]);

    app.listen();
    logger.info("✅ Chatverse Backend started successfully!");

    // Initialize graceful shutdown handlers
    gracefulShutdown.initialize();

    // Register cleanup tasks
    gracefulShutdown.registerCleanupTask(async () => {
      logger.info("1️⃣ Stopping new requests...");
      // Note: Express server shutdown is handled automatically
    });

    gracefulShutdown.registerCleanupTask(async () => {
      // Close Redis connection (if active)
      try {
        const { disconnectRedis } = require("./utils/redis");
        await disconnectRedis();
        logger.info("✅ Redis connection closed");
      } catch (error) {
        logger.warn("⚠️ Redis disconnect skipped (not connected)");
      }
    });

    gracefulShutdown.registerCleanupTask(async () => {
      // Close Pinecone connection (if any cleanup needed)
      logger.info("✅ Pinecone connection closed");
    });

    gracefulShutdown.registerCleanupTask(async () => {
      // Close database connections - MOST CRITICAL
      try {
        const knex = require("../database/index.schema").default;
        await knex.destroy();
        logger.info("✅ Database connections closed properly");
      } catch (error) {
        logger.error("❌ Error closing database:", error);
      }
    });
  } catch (error) {
    logger.error(
      "App failed to start: " + (error && error.stack ? error.stack : error)
    );
    console.error("App failed to start:", error);
    process.exit(1); // Stop if critical services fail
  }
}
bootstrap();
