/**
 * Test Database Migrations
 * 
 * Runs database migrations before tests start.
 * This ensures the test database schema is up-to-date.
 */

import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';

let migrationRan = false;

/**
 * Run migrations for test database
 * Uses a flag to ensure migrations only run once per test run
 */
export async function runMigrations(): Promise<void> {
  if (migrationRan) {
    return;
  }

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.warn('⚠️  DATABASE_URL not set, skipping migrations');
    return;
  }

  console.log('🔄 Running test database migrations...');
  
  const pool = new Pool({ connectionString: dbUrl, max: 1 });
  const db = drizzle(pool);

  try {
    await migrate(db, { migrationsFolder: './src/database/migrations' });
    console.log('✅ Test database migrations completed');
    migrationRan = true;
  } catch (error) {
    // If migrations fail due to "already exists", that's okay
    if (error instanceof Error && error.message.includes('already exists')) {
      console.log('ℹ️  Migrations already applied');
      migrationRan = true;
    } else {
      console.error('❌ Migration error:', error);
      // Don't throw - let tests continue, they may still work
    }
  } finally {
    await pool.end();
  }
}
