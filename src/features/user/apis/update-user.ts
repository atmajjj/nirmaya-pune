/**
 * PUT /api/v1/users/:id
 * Update user (Requires auth)
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import { RequestWithUser } from '../../../interfaces/request.interface';
import { requireAuth } from '../../../middlewares/auth.middleware';
import { requireRole } from '../../../middlewares/role.middleware';
import validationMiddleware from '../../../middlewares/validation.middleware';
import { ResponseFormatter } from '../../../utils/responseFormatter';
import { asyncHandler, parseIdParam, getUserId } from '../../../utils/controllerHelpers';
import { sanitizeUser } from '../../../utils/sanitizeUser';
import HttpException from '../../../utils/httpException';
import { db } from '../../../database/drizzle';
import { users, userRoles } from '../shared/schema';
import { IUser } from '../shared/interface';
import { findUserById, findUserByEmail } from '../shared/queries';

const updateUserSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  email: z.string().email('Invalid email format').optional(),
  phone_number: z.string().optional(),
  password: z.string().min(8, 'Password must be at least 8 characters long').optional(),
  role: z.enum(userRoles).optional(),
  updated_by: z.number().optional(),
});

type UpdateUser = z.infer<typeof updateUserSchema>;

async function updateUser(id: number, data: UpdateUser, updatedBy: number): Promise<IUser> {
  const existingUser = await findUserById(id);

  if (!existingUser) {
    throw new HttpException(404, 'User not found');
  }

  if (data.email && data.email !== existingUser.email) {
    const existingUserWithEmail = await findUserByEmail(data.email);

    if (existingUserWithEmail && existingUserWithEmail.id !== id) {
      throw new HttpException(409, 'Email already exists');
    }
  }

  const updateData: Partial<IUser> = {
    ...data,
    updated_by: updatedBy,
  };

  if (data.password) {
    updateData.password = await bcrypt.hash(data.password, 10);
  }

  const [result] = await db
    .update(users)
    .set({
      ...updateData,
      updated_at: new Date(),
    })
    .where(eq(users.id, id))
    .returning();

  if (!result) {
    throw new HttpException(500, 'Failed to update user');
  }

  return result as IUser;
}

const handler = asyncHandler(async (req: RequestWithUser, res: Response) => {
  const id = parseIdParam(req);
  const updateData: UpdateUser = req.body;
  const userId = getUserId(req);

  const user = await updateUser(id, updateData, userId);
  const userResponse = sanitizeUser(user);

  ResponseFormatter.success(res, userResponse, 'User updated successfully');
});

const router = Router();
router.put(
  '/:id',
  requireAuth,
  requireRole(['admin', 'scientist', 'researcher', 'policymaker']),
  validationMiddleware(updateUserSchema),
  handler
);

export default router;
