/**
 * Database Usage Examples
 * Demonstrates best practices for using the database module
 */

import { db, pool } from './drizzle';
import { checkDatabaseHealth } from './health';
import { users } from '../features/user/shared/schema';
import { uploads } from '../features/upload/shared/schema';
import { eq, and, or, like, desc } from 'drizzle-orm';
import { logger } from '../utils/logger';

// ============================================
// 1. BASIC QUERIES
// ============================================

/**
 * NOTE: Basic CRUD operations are implemented in feature-specific query files:
 * - createUser, findUserByEmail, updateUser, deleteUser → src/features/user/user.queries.ts
 * - Similar patterns apply to other features
 */

/**
 * Search users with pagination (advanced query example)
 */
async function searchUsers(search: string, page: number = 1, limit: number = 10) {
  const offset = (page - 1) * limit;

  const results = await db
    .select()
    .from(users)
    .where(
      and(
        or(like(users.name, `%${search}%`), like(users.email, `%${search}%`)),
        eq(users.is_deleted, false)
      )
    )
    .orderBy(desc(users.created_at))
    .limit(limit)
    .offset(offset);

  return results;
}

/**
 * Get user with their uploads (join example)
 */
async function getUserWithUploads(userId: number) {
  const result = await db
    .select({
      user: users,
      upload: uploads,
    })
    .from(users)
    .leftJoin(uploads, eq(users.id, uploads.user_id))
    .where(eq(users.id, userId));

  return result;
}

// ============================================
// 3. TRANSACTIONS
// ============================================

/**
 * Example transaction: Create user and their first upload
 */
async function createUserWithUpload(
  userData: { name: string; email: string; password: string },
  uploadData: { filename: string; file_path: string; file_size: number }
) {
  return await db.transaction(async tx => {
    // Insert user
    const [newUser] = await tx
      .insert(users)
      .values({
        ...userData,
        created_by: 1,
      })
      .returning();

    // Insert upload for the user
    const [newUpload] = await tx
      .insert(uploads)
      .values({
        user_id: newUser.id,
        filename: uploadData.filename,
        original_filename: uploadData.filename,
        mime_type: 'application/octet-stream',
        file_size: uploadData.file_size,
        file_path: uploadData.file_path,
        file_url: `https://example.com/${uploadData.file_path}`,
        created_by: newUser.id,
      })
      .returning();

    return { user: newUser, upload: newUpload };
  });
}

// ============================================
// 2. MONITORING & HEALTH
// ============================================

/**
 * Check database health
 */
async function monitorDatabase() {
  // Get pool statistics
  const stats = {
    total: pool.totalCount,
    idle: pool.idleCount,
    waiting: pool.waitingCount,
  };
  logger.info(`Pool Stats: ${JSON.stringify(stats)}`);

  // Run health check
  const health = await checkDatabaseHealth();
  logger.info(`Health Check: ${JSON.stringify(health)}`);

  return { stats, health };
}

/**
 * Monitor pool usage over time
 */
function setupPoolMonitoring() {
  setInterval(() => {
    const stats = {
      total: pool.totalCount,
      idle: pool.idleCount,
      waiting: pool.waitingCount,
    };
    if (stats.waiting > 0) {
      logger.warn(`Database pool has waiting connections: ${JSON.stringify(stats)}`);
    }
  }, 30000); // Check every 30 seconds
}

// ============================================
// 5. RAW SQL (when needed)
// ============================================

import { sql } from 'drizzle-orm';

/**
 * Execute raw SQL for complex queries
 */
async function complexQuery() {
  const result = await db.execute(sql`
    SELECT 
      u.id,
      u.name,
      COUNT(up.id) as upload_count,
      SUM(up.file_size) as total_size
    FROM users u
    LEFT JOIN uploads up ON u.id = up.user_id AND up.is_deleted = false
    WHERE u.is_deleted = false
    GROUP BY u.id, u.name
    HAVING COUNT(up.id) > 0
    ORDER BY upload_count DESC
    LIMIT 10
  `);

  return result.rows;
}

// ============================================
// EXPORT EXAMPLES
// ============================================

export {
  searchUsers,
  getUserWithUploads,
  createUserWithUpload,
  monitorDatabase,
  setupPoolMonitoring,
  complexQuery,
};
