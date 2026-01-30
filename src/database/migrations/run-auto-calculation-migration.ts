/**
 * Run auto-calculation migration
 */

import { db } from '../drizzle';
import { sql } from 'drizzle-orm';
import { logger } from '../../utils/logger';

async function runMigration() {
  try {
    logger.info('Running auto-calculation migration...');

    // Add columns
    await db.execute(sql`
      ALTER TABLE data_sources 
      ADD COLUMN IF NOT EXISTS calculation_status VARCHAR(20) DEFAULT 'not_started',
      ADD COLUMN IF NOT EXISTS calculation_upload_id INTEGER REFERENCES uploads(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS calculation_error TEXT,
      ADD COLUMN IF NOT EXISTS calculation_completed_at TIMESTAMP;
    `);

    // Create index
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_data_sources_calculation_status 
      ON data_sources(calculation_status) WHERE calculation_status != 'not_started';
    `);

    logger.info('✅ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    logger.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
