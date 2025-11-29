import { logger } from "../utils/logger";

export class GracefulShutdown {
  private isShuttingDown = false;
  private cleanupTasks: Array<() => Promise<void> | void> = [];

  /**
   * Register a cleanup task to be executed during shutdown
   * Tasks are executed in the order they are registered
   */
  public registerCleanupTask(task: () => Promise<void> | void): void {
    this.cleanupTasks.push(task);
  }

  /**
   * Initialize graceful shutdown handlers for common signals
   */
  public initialize(): void {
    // Handle termination signals
    process.on("SIGTERM", () => this.handleShutdown("SIGTERM"));
    process.on("SIGINT", () => this.handleShutdown("SIGINT"));

    // Handle uncaught errors
    process.on("uncaughtException", (error) => {
      logger.error("❌ Uncaught Exception:", error);
      this.handleShutdown("uncaughtException");
    });

    process.on("unhandledRejection", (reason, promise) => {
      logger.error("❌ Unhandled Rejection at:", promise, "reason:", reason);
      this.handleShutdown("unhandledRejection");
    });

    logger.info("✅ Graceful shutdown handlers initialized");
  }

  /**
   * Handle the shutdown process
   */
  private async handleShutdown(signal: string): Promise<void> {
    if (this.isShuttingDown) {
      logger.warn(`⚠️ Shutdown already in progress, ignoring ${signal}`);
      return;
    }

    this.isShuttingDown = true;
    logger.info(`\n🛑 Received ${signal}, starting graceful shutdown...`);

    try {
      // Execute all registered cleanup tasks
      for (let i = 0; i < this.cleanupTasks.length; i++) {
        try {
          logger.info(`${i + 1}️⃣ Executing cleanup task ${i + 1}...`);
          await this.cleanupTasks[i]();
        } catch (error) {
          logger.error(`❌ Error in cleanup task ${i + 1}:`, error);
          // Continue with other tasks even if one fails
        }
      }

      logger.info("✨ Graceful shutdown completed successfully");
      process.exit(0);
    } catch (error) {
      logger.error("❌ Error during graceful shutdown:", error);
      process.exit(1);
    }
  }
}

// Default instance for convenience
export const gracefulShutdown = new GracefulShutdown();