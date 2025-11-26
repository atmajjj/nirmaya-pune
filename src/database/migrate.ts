// Load env FIRST, before any other imports
import { loadEnv } from '../utils/loadEnv';
const nodeEnv = loadEnv();

import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import { logger } from '../utils/logger';
import { getDatabaseUrl, getMaskedDatabaseUrl } from '../utils/dbUrl';

/**
 * Run database migrations
 * This applies all pending migrations to the database
 * 
 * Usage:
 *   npm run db:migrate:dev   - Migrate development database
 *   npm run db:migrate:test  - Migrate test database  
 *   npm run db:migrate:prod  - Migrate production database
 */
async function runMigrations() {
  const connectionString = getDatabaseUrl();

  logger.info(`🔄 Starting database migration for ${nodeEnv} environment...`);
  logger.info(`📍 Database: ${getMaskedDatabaseUrl()}`); // Hide password

  // Create connection for migrations
  const pool = new Pool({ connectionString, max: 1 });
  const db = drizzle(pool);

  try {
    await migrate(db, { migrationsFolder: './src/database/migrations' });
    logger.info(`✅ Database migration completed successfully for ${nodeEnv}!`);
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
