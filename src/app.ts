import express from 'express';
import hpp from 'hpp';
import compression from 'compression';
import { authRateLimit, apiRateLimit } from './middlewares/rate-limit.middleware';
import { requestIdMiddleware } from './middlewares/request-id.middleware';
import { securityMiddleware } from './middlewares/security.middleware';
import { corsMiddleware } from './middlewares/cors.middleware';
import { requestLoggerMiddleware } from './middlewares/request-logger.middleware';
import Routes from './interfaces/route.interface';
import errorMiddleware from './middlewares/error.middleware';
import { logger } from './utils/logger';
import { config } from './utils/validateEnv';
import { checkDatabaseHealth } from './database/health';
import { isRedisReady } from './utils/redis';

class App {
  public app: express.Application;
  public port: number;
  public env: string;

  constructor(routes: Routes[]) {
    // Initialize the express app
    this.app = express();
    this.port = config.PORT;
    this.env = config.NODE_ENV;

    this.initializeMiddlewares();
    this.initializeRoutes(routes);
    this.initializeErrorHandling();

    this.app.get('/', (req, res) => {
      res.send('Welcome to Nirmaya Backend API');
    });

    // Health check endpoint with dependency status
    this.app.get('/health', async (req, res) => {
      try {
        // Check database health
        const dbHealth = await checkDatabaseHealth();
        const redisHealthy = isRedisReady();
        
        const isHealthy = dbHealth.status === 'healthy';
        
        res.status(isHealthy ? 200 : 503).json({
          status: isHealthy ? 'healthy' : 'degraded',
          timestamp: new Date().toISOString(),
          environment: this.env,
          uptime: process.uptime(),
          memory: {
            used: Math.round((process.memoryUsage().heapUsed / 1024 / 1024) * 100) / 100,
            total: Math.round((process.memoryUsage().heapTotal / 1024 / 1024) * 100) / 100,
          },
          version: '1.0.0',
          dependencies: {
            database: {
              status: dbHealth.status,
              poolStats: dbHealth.details.poolStats,
            },
            redis: {
              status: redisHealthy ? 'healthy' : 'unavailable',
            },
          },
        });
      } catch {
        res.status(503).json({
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          error: 'Health check failed',
        });
      }
    });
  }

  public listen() {
    const port = Number(this.port);
    const server = this.app.listen(port, '0.0.0.0', () => {
      logger.info(
        `🚀 Nirmaya Backend API listening on port ${port}. Environment: ${this.env}.`
      );
    });
    
    // Configure server timeouts to prevent resource exhaustion
    server.timeout = 30000; // 30 seconds request timeout
    server.keepAliveTimeout = 65000; // Slightly higher than ALB default (60s)
    server.headersTimeout = 66000; // Slightly higher than keepAliveTimeout
    
    return server;
  }

  public getServer() {
    return this.app;
  }

  private initializeMiddlewares() {
    // Request ID middleware (must be first)
    this.app.use(requestIdMiddleware);

    // Security middlewares
    this.app.use(securityMiddleware);
    this.app.use(corsMiddleware);
    this.app.use(hpp());

    // Logging middleware
    this.app.use(requestLoggerMiddleware);

    // Compression
    this.app.use(compression());

    // Rate limiting - auth endpoints (stricter)
    this.app.use('/api/v1/auth/login', authRateLimit);
    this.app.use('/api/v1/auth/register', authRateLimit);
    this.app.use('/api/v1/auth/refresh-token', authRateLimit);
    // General API rate limiting
    this.app.use('/api/v1/', apiRateLimit);

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ limit: '10mb', extended: true }));
  }

  private initializeRoutes(routes: Routes[]) {
    // Routes now handle auth individually with requireAuth
    routes.forEach(route => {
      this.app.use('/api/v1/', route.router);
    });
  }

  private initializeErrorHandling() {
    this.app.use(errorMiddleware);
  }
}

export default App;
