/**
 * GET /api/v1/users
 * Get all users (Admin only)
 */

import { Router, Response } from 'express';
import { eq } from 'drizzle-orm';
import { Request } from 'express';
import { requireAuth } from '../../../middlewares/auth.middleware';
import { requireRole } from '../../../middlewares/role.middleware';
import { ResponseFormatter } from '../../../utils/responseFormatter';
import { asyncHandler } from '../../../utils/controllerHelpers';
import { sanitizeUsers } from '../../../utils/sanitizeUser';
import { db } from '../../../database/drizzle';
import { users } from '../shared/schema';
import { IUser } from '../shared/interface';

async function getAllUsers(): Promise<IUser[]> {
  const allUsers = await db.select().from(users).where(eq(users.is_deleted, false));
  return allUsers as IUser[];
}

const handler = asyncHandler(async (req: Request, res: Response) => {
  const usersList = await getAllUsers();
  const usersResponse = sanitizeUsers(usersList);

  ResponseFormatter.success(res, usersResponse, 'Users retrieved successfully');
});

const router = Router();
router.get('/', requireAuth, requireRole('admin'), handler);

export default router;
