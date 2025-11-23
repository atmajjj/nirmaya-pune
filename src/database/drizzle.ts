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
 */
export const pool = new Pool({
  connectionString,
  max: 10, // Maximum number of connections in pool
  idleTimeoutMillis: 20000, // Close idle connections after 20 seconds
  connectionTimeoutMillis: 10000, // Connection timeout in milliseconds
  ssl: isProduction ? { rejectUnauthorized: false } : undefined,
});

/**
 * Combined schema for Drizzle
 */
export const schema = {
  users,
  uploads,
  invitations,
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
