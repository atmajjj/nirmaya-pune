import dotenv from 'dotenv';
dotenv.config();

import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import { logger } from '../utils/logger';

/**
 * Run database migrations
 * This applies all pending migrations to the database
 */
async function runMigrations() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    logger.error('DATABASE_URL environment variable is not set');
    throw new Error('DATABASE_URL is required');
  }

  logger.info('🔄 Starting database migration...');

  // Create connection for migrations
  const pool = new Pool({ connectionString, max: 1 });
  const db = drizzle(pool);

  try {
    await migrate(db, { migrationsFolder: './src/database/migrations' });
    logger.info('✅ Database migration completed successfully!');
  } catch (error) {
    logger.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
    process.exit(0);
  }
}

// Run migrations
runMigrations();
