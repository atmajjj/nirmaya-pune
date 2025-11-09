import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { config } from 'dotenv';
import { sql } from 'drizzle-orm';
import { logger } from '../../src/utils/logger';
import { pool as mainPool } from '../../src/database/drizzle';

config();

export class DatabaseTestHelper {
  private static instance: DatabaseTestHelper;
  private pool: Pool;
  private db: ReturnType<typeof drizzle>;

  private constructor() {
    // Reuse the existing database connection from drizzle.ts
    this.pool = mainPool;
    this.db = drizzle(this.pool);
  }

  public static getInstance(): DatabaseTestHelper {
    if (!DatabaseTestHelper.instance) {
      DatabaseTestHelper.instance = new DatabaseTestHelper();
    }
    return DatabaseTestHelper.instance;
  }

  public getDb() {
    return this.db;
  }

  public getPool() {
    return this.pool;
  }

  // Clean all test tables
  public async cleanup(): Promise<void> {
    try {
      await this.db.execute(sql`TRUNCATE TABLE uploads CASCADE`);
      await this.db.execute(sql`TRUNCATE TABLE users CASCADE`);
    } catch (error) {
      logger.warn(`Database cleanup warning: ${error}`);
    }
  }

  // Close database connection
  public async close(): Promise<void> {
    await this.pool.end();
  }

  // Reset sequences
  public async resetSequences(): Promise<void> {
    try {
      await this.db.execute(sql`ALTER SEQUENCE users_id_seq RESTART WITH 1`);
      await this.db.execute(sql`ALTER SEQUENCE uploads_id_seq RESTART WITH 1`);
    } catch (error) {
      logger.warn(`Database reset sequences warning: ${error}`);
    }
  }
}

export const dbHelper = DatabaseTestHelper.getInstance();
