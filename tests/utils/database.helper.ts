import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { config } from 'dotenv';
import { sql } from 'drizzle-orm';
import { logger } from '../../src/utils/logger';
import { pool as mainPool, db as mainDb } from '../../src/database/drizzle';

config();

/**
 * Database Test Helper
 * Provides utilities for test database setup, cleanup, and management.
 * Uses singleton pattern to reuse connections across test suites.
 */
export class DatabaseTestHelper {
  private static instance: DatabaseTestHelper;
  private pool: Pool;
  private db: ReturnType<typeof drizzle>;
  private isConnected: boolean = false;

  private constructor() {
    // Reuse the existing database connection from drizzle.ts
    // This ensures we use the same pool configuration (max connections, etc.)
    this.pool = mainPool;
    this.db = mainDb;
    this.isConnected = true;
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

  /**
   * Check if database connection is healthy
   */
  public async checkConnection(): Promise<boolean> {
    try {
      await this.db.execute(sql`SELECT 1`);
      this.isConnected = true;
      return true;
    } catch (error) {
      this.isConnected = false;
      logger.error('Database connection check failed:', error);
      return false;
    }
  }

  // Clean all test tables
  public async cleanup(): Promise<void> {
    if (!this.isConnected) {
      logger.warn('Database not connected, skipping cleanup');
      return;
    }
    try {
      // Use transaction for atomic cleanup
      // Order matters due to foreign key constraints
      await this.db.execute(sql`
        BEGIN;
        TRUNCATE TABLE chatbot_messages CASCADE;
        TRUNCATE TABLE chatbot_sessions CASCADE;
        TRUNCATE TABLE chatbot_documents CASCADE;
        TRUNCATE TABLE researcher_applications CASCADE;
        TRUNCATE TABLE invitation CASCADE;
        TRUNCATE TABLE uploads CASCADE;
        TRUNCATE TABLE users CASCADE;
        COMMIT;
      `);
    } catch (error) {
      logger.warn(`Database cleanup warning: ${error}`);
      // Fallback to individual truncates if transaction fails
      try {
        await this.db.execute(sql`TRUNCATE TABLE chatbot_messages CASCADE`);
        await this.db.execute(sql`TRUNCATE TABLE chatbot_sessions CASCADE`);
        await this.db.execute(sql`TRUNCATE TABLE chatbot_documents CASCADE`);
        await this.db.execute(sql`TRUNCATE TABLE researcher_applications CASCADE`);
        await this.db.execute(sql`TRUNCATE TABLE invitation CASCADE`);
        await this.db.execute(sql`TRUNCATE TABLE uploads CASCADE`);
        await this.db.execute(sql`TRUNCATE TABLE users CASCADE`);
      } catch (fallbackError) {
        logger.error(`Database cleanup fallback failed: ${fallbackError}`);
      }
    }
  }

  // Close database connection - only call at end of all tests
  public async close(): Promise<void> {
    // Don't actually close the main pool during tests
    // as it would affect other test suites running in parallel
    logger.info('Database helper close called - pool remains open for other tests');
    this.isConnected = false;
  }

  /**
   * Force close the pool - use only in jest globalTeardown
   */
  public async forceClose(): Promise<void> {
    try {
      await this.pool.end();
      this.isConnected = false;
      logger.info('Database pool closed successfully');
    } catch (error) {
      logger.error(`Error closing database pool: ${error}`);
    }
  }

  // Reset sequences
  public async resetSequences(): Promise<void> {
    try {
      // Core tables
      await this.db.execute(sql`ALTER SEQUENCE invitation_invitation_id_seq RESTART WITH 1`);
      await this.db.execute(sql`ALTER SEQUENCE users_id_seq RESTART WITH 1`);
      await this.db.execute(sql`ALTER SEQUENCE uploads_id_seq RESTART WITH 1`);
      // Chatbot tables
      await this.db.execute(sql`ALTER SEQUENCE chatbot_documents_id_seq RESTART WITH 1`);
      await this.db.execute(sql`ALTER SEQUENCE chatbot_sessions_id_seq RESTART WITH 1`);
      await this.db.execute(sql`ALTER SEQUENCE chatbot_messages_id_seq RESTART WITH 1`);
    } catch (error) {
      logger.warn(`Database reset sequences warning: ${error}`);
    }
  }
}

export const dbHelper = DatabaseTestHelper.getInstance();
