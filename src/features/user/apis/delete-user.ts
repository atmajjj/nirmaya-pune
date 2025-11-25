/**
 * DELETE /api/v1/users/:id
 * Soft delete user (Admin only)
 * - Prevents self-deletion
 * - Prevents deleting the last admin
 */

import { Router, Response } from 'express';
import { eq, and, count } from 'drizzle-orm';
import { RequestWithUser } from '../../../interfaces/request.interface';
import { requireAuth } from '../../../middlewares/auth.middleware';
import { requireRole } from '../../../middlewares/role.middleware';
import { ResponseFormatter } from '../../../utils/responseFormatter';
import { asyncHandler, parseIdParam, getUserId } from '../../../utils/controllerHelpers';
import HttpException from '../../../utils/httpException';
import { db } from '../../../database/drizzle';
import { users } from '../shared/schema';
import { findUserById } from '../shared/queries';

/** Cache for admin count to avoid repeated queries */
let cachedAdminCount: number | null = null;
let adminCountLastUpdated: number = 0;
const ADMIN_COUNT_CACHE_TTL = 60000; // 1 minute cache

/**
 * Count active admins in the system (with caching)
 */
async function countActiveAdmins(): Promise<number> {
  const now = Date.now();
  
  // Return cached value if still valid
  if (cachedAdminCount !== null && (now - adminCountLastUpdated) < ADMIN_COUNT_CACHE_TTL) {
    return cachedAdminCount;
  }
  
  const [result] = await db
    .select({ count: count() })
    .from(users)
    .where(and(eq(users.role, 'admin'), eq(users.is_deleted, false)));
  
  cachedAdminCount = result?.count ?? 0;
  adminCountLastUpdated = now;
  
  return cachedAdminCount;
}

/**
 * Invalidate admin count cache (call after admin role changes)
 */
export function invalidateAdminCountCache(): void {
  cachedAdminCount = null;
}

async function deleteUser(id: number, deletedBy: number): Promise<void> {
  // Prevent self-deletion
  if (id === deletedBy) {
    throw new HttpException(400, 'Cannot delete your own account');
  }

  const existingUser = await findUserById(id);
  if (!existingUser) {
    throw new HttpException(404, 'User not found');
  }

  // Prevent deleting the last admin
  if (existingUser.role === 'admin') {
    const adminCount = await countActiveAdmins();
    if (adminCount <= 1) {
      throw new HttpException(400, 'Cannot delete the last admin account');
    }
  }

  await db
    .update(users)
    .set({
      is_deleted: true,
      deleted_by: deletedBy,
      deleted_at: new Date(),
    })
    .where(eq(users.id, id));
  
  // Invalidate admin count cache if deleting an admin
  if (existingUser.role === 'admin') {
    invalidateAdminCountCache();
  }
}

const handler = asyncHandler(async (req: RequestWithUser, res: Response) => {
  const id = parseIdParam(req);
  const userId = getUserId(req);

  await deleteUser(id, userId);

  ResponseFormatter.success(res, null, 'User deleted successfully');
});

const router = Router();
router.delete('/:id', requireAuth, requireRole('admin'), handler);

export default router;
