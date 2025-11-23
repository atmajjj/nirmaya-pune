import App from './app';
import { logger } from './utils/logger';
import { validateEnv } from './utils/validateEnv';
import UserRoute from './features/user';
import AuthRoute from './features/auth';
import UploadRoute from './features/upload';
import AdminInviteRoute from './features/admin-invite';
import { checkDatabaseHealth } from './database/health';
import { pool } from './database/drizzle';
import { redisClient } from './utils/redis';
import { setupGracefulShutdown } from './utils/gracefulShutdown';

validateEnv();

let server: import('http').Server;

async function bootstrap() {
  try {
    logger.info('🚀 Starting Nirmaya Backend...');

    // Check DB connection
    const health = await checkDatabaseHealth();
    if (health.status === 'unhealthy') {
      throw new Error(`Database health check failed: ${health.message}`);
    }
    logger.info('✅ Database connected', { poolStats: health.details.poolStats });

    // Initialize Redis connection (optional - skip for now)
    logger.info('ℹ️ Redis connection skipped during startup (optional service)');
    // await testRedisConnection();

    // Start Express app
    const app = new App([new AuthRoute(), new UserRoute(), new UploadRoute(), new AdminInviteRoute()]);

    server = app.listen();

    // Setup graceful shutdown with resources
    setupGracefulShutdown({
      server,
      database: pool,
      redis: redisClient,
    });

    logger.info('✅ Nirmaya Backend started successfully!');
  } catch (error) {
    logger.error('App failed to start: ' + (error && error.stack ? error.stack : error));
    process.exit(1); // Stop if critical services fail
  }
}

bootstrap();
