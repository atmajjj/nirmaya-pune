import App from './app';
import { logger } from './utils/logger';
import UserRoute from './features/user';
import AuthRoute from './features/auth';
import UploadRoute from './features/upload';
import AdminInviteRoute from './features/admin-invite';
import ChatbotRoute from './features/chatbot';
import HMPIEngineRoute from './features/hmpi-engine';
import FormulaEditorRoute from './features/formula-editor';
import { HMPIReportRoutes } from './features/hmpi-report';
import ResearcherRoute from './features/researcher';
import DataSourcesRoute from './features/data-sources';
import { connectWithRetry, pool } from './database/drizzle';
import { redisClient, testRedisConnection } from './utils/redis';
import { setupGracefulShutdown } from './utils/gracefulShutdown';

let server: import('http').Server;

async function bootstrap() {
  try {
    logger.info('🚀 Starting Nirmaya Backend...');

    // Connect to database with retry (useful in containerized environments)
    const dbConnected = await connectWithRetry(5, 1000);
    if (!dbConnected) {
      throw new Error('Failed to connect to database after multiple retries');
    }
    logger.info('✅ Database connected');

    // Initialize Redis connection
    await testRedisConnection();

    // Start Express app
    const app = new App([
      new AuthRoute(),
      new UserRoute(),
      new UploadRoute(),
      new AdminInviteRoute(),
      new ChatbotRoute(),
      new HMPIEngineRoute(),
      new FormulaEditorRoute(),
      new HMPIReportRoutes(),
      new ResearcherRoute(),
      new DataSourcesRoute(),
    ]);

    server = app.listen();

    // Setup graceful shutdown with resources
    setupGracefulShutdown({
      server,
      database: pool,
      redis: redisClient,
    });

    logger.info('✅ Nirmaya Backend started successfully!');
  } catch (error) {
    logger.error('App failed to start', { 
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    process.exit(1); // Stop if critical services fail
  }
}

bootstrap();
