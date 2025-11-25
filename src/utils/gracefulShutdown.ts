import { logger } from './logger';

/**
 * Graceful shutdown utility
 * Handles clean shutdown of the application and all its resources
 */

interface ShutdownResources {
  server?: import('http').Server;
  database?: { end: () => Promise<void> };
  redis?: { isOpen: boolean; quit: () => Promise<string> };
}

/**
 * Promisify server.close() for proper async handling
 */
function closeServer(server: import('http').Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

/**
 * Graceful shutdown handler
 * Ensures all connections are properly closed before exiting
 */
export async function gracefulShutdown(signal: string, resources: ShutdownResources = {}) {
  logger.info(`🛑 Received ${signal}. Starting graceful shutdown...`);

  try {
    // Close HTTP server first (stop accepting new connections)
    if (resources.server) {
      logger.info('🔌 Closing HTTP server...');
      await closeServer(resources.server);
      logger.info('✅ HTTP server closed');
    }

    // Close database connections
    if (resources.database) {
      logger.info('🔌 Closing database connections...');
      await resources.database.end();
      logger.info('✅ Database connections closed');
    }

    // Close Redis connection if connected
    if (resources.redis) {
      try {
        if (resources.redis.isOpen) {
          logger.info('🔌 Closing Redis connection...');
          await resources.redis.quit();
          logger.info('✅ Redis connection closed');
        }
      } catch (redisError) {
        logger.warn('⚠️ Error closing Redis connection:', redisError);
      }
    }

    logger.info('✅ Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    logger.error('❌ Error during graceful shutdown:', error);
    process.exit(1);
  }
}

/**
 * Setup signal handlers for graceful shutdown
 */
export function setupGracefulShutdown(resources: ShutdownResources = {}) {
  // Handle shutdown signals
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM', resources));
  process.on('SIGINT', () => gracefulShutdown('SIGINT', resources));

  // Handle uncaught exceptions
  process.on('uncaughtException', error => {
    logger.error('❌ Uncaught Exception:', error);
    gracefulShutdown('uncaughtException', resources);
  });

  process.on('unhandledRejection', (reason, promise) => {
    logger.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    gracefulShutdown('unhandledRejection', resources);
  });

  logger.info('🛡️ Graceful shutdown handlers configured');
}
