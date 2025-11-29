import dotenv from 'dotenv';
dotenv.config({ quiet: true });

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { logger } from '../utils/logger';
import { config, isProduction, isDevelopment } from '../utils/validateEnv';

// Import all schemas
import { users } from '../features/user/shared/schema';
import { uploads } from '../features/upload/shared/schema';
import { invitations } from '../features/admin-invite/shared/schema';
import {
  chatbotDocuments,
  chatbotSessions,
  chatbotMessages,
} from '../features/chatbot/shared/schema';

/**
 * Database connection configuration
 */
const connectionString = config.DATABASE_URL;

if (!connectionString) {
  logger.error('DATABASE_URL environment variable is required for database connection');
  throw new Error('DATABASE_URL environment variable is required for database connection');
}

/**
 * PostgreSQL connection pool using node-postgres (pg)
 * More mature and production-ready than postgres-js
 * 
 * SSL Configuration:
 * - Production: Requires SSL with certificate validation
 * - Set DATABASE_SSL_CA env var for custom CA certificate
 * - Development: No SSL required
 */
const sslConfig = isProduction
  ? {
      rejectUnauthorized: true, // Always validate certificates in production
      // If using self-signed certs, set DATABASE_SSL_CA env var
      ca: process.env.DATABASE_SSL_CA || undefined,
    }
  : undefined;

export const pool = new Pool({
  connectionString,
  max: 10, // Maximum number of connections in pool
  idleTimeoutMillis: 20000, // Close idle connections after 20 seconds
  connectionTimeoutMillis: 10000, // Connection timeout in milliseconds
  ssl: sslConfig,
});

/**
 * Retry database connection with exponential backoff
 * Useful in containerized environments where DB may not be ready immediately
 */
export async function connectWithRetry(maxRetries: number = 5, baseDelayMs: number = 1000): Promise<boolean> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const client = await pool.connect();
      client.release();
      logger.info(`Database connected successfully on attempt ${attempt}`);
      return true;
    } catch (error) {
      const delay = baseDelayMs * Math.pow(2, attempt - 1); // Exponential backoff
      logger.warn(`Database connection attempt ${attempt}/${maxRetries} failed. Retrying in ${delay}ms...`, {
        error: error instanceof Error ? error.message : String(error)
      });
      
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  logger.error(`Failed to connect to database after ${maxRetries} attempts`);
  return false;
}

/**
 * Combined schema for Drizzle
 */
export const schema = {
  users,
  uploads,
  invitations,
  chatbotDocuments,
  chatbotSessions,
  chatbotMessages,
};

/**
 * Drizzle database instance
 * This is the main database client used throughout the application
 */
export const db = drizzle(pool, {
  schema,
  logger: isDevelopment,
});

/**
 * Close database connection
 * Should be called when shutting down the application
 */
export const closeDatabase = async () => {
  await pool.end();
};

// Note: Only import `db` for queries, `pool` is only needed for:
// - Health checks (pool stats)
// - Graceful shutdown
// - Test utilities
