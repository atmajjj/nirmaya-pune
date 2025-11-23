/**
 * DELETE /api/v1/users/:id
 * Soft delete user (Admin only)
 */

import { Router, Response } from 'express';
import { eq } from 'drizzle-orm';
import { RequestWithUser } from '../../../interfaces/request.interface';
import { requireAuth } from '../../../middlewares/auth.middleware';
import { requireRole } from '../../../middlewares/role.middleware';
import { ResponseFormatter } from '../../../utils/responseFormatter';
import { asyncHandler, parseIdParam, getUserId } from '../../../utils/controllerHelpers';
import HttpException from '../../../utils/httpException';
import { db } from '../../../database/drizzle';
import { users } from '../shared/schema';
import { findUserById } from '../shared/queries';

async function deleteUser(id: number, deletedBy: number): Promise<void> {
  const existingUser = await findUserById(id);

  if (!existingUser) {
    throw new HttpException(404, 'User not found');
  }

  await db
    .update(users)
    .set({
      is_deleted: true,
      deleted_by: deletedBy,
      deleted_at: new Date(),
    })
    .where(eq(users.id, id));
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
