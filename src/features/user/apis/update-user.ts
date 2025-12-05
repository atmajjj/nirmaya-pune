/**
 * PUT /api/users/:id
 * Update user (Requires auth)
 * - Users can only update their own profile (name, email, phone, password)
 * - Admins can update any user including role changes
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { RequestWithUser } from '../../../interfaces/request.interface';
import { hashPassword } from '../../../utils/password';
import { requireAuth } from '../../../middlewares/auth.middleware';
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
});

type UpdateUser = z.infer<typeof updateUserSchema>;

async function updateUser(
  id: number, 
  data: UpdateUser, 
  requesterId: number,
  requesterRole: string
): Promise<IUser> {
  const existingUser = await findUserById(id);

  if (!existingUser) {
    throw new HttpException(404, 'User not found');
  }

  // Ownership check: non-admins can only update their own profile
  const isAdmin = requesterRole === 'admin';
  const isOwnProfile = id === requesterId;

  if (!isAdmin && !isOwnProfile) {
    throw new HttpException(403, 'You can only update your own profile');
  }

  // Role changes are admin-only
  if (data.role && !isAdmin) {
    throw new HttpException(403, 'Only admins can change user roles');
  }

  // Prevent admin from demoting themselves if they're the only admin
  if (isAdmin && isOwnProfile && data.role && data.role !== 'admin') {
    throw new HttpException(400, 'Cannot change your own admin role');
  }

  if (data.email && data.email !== existingUser.email) {
    const existingUserWithEmail = await findUserByEmail(data.email);

    if (existingUserWithEmail && existingUserWithEmail.id !== id) {
      throw new HttpException(409, 'Email already exists');
    }
  }

  const updateData: Partial<IUser> = {
    ...data,
    updated_by: requesterId,
  };

  if (data.password) {
    updateData.password = await hashPassword(data.password);
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
  const userRole = req.userRole || 'scientist';

  const user = await updateUser(id, updateData, userId, userRole);
  const userResponse = sanitizeUser(user);

  ResponseFormatter.success(res, userResponse, 'User updated successfully');
});

const router = Router();
// All authenticated users can access, but ownership is checked in handler
router.put(
  '/:id',
  requireAuth,
  validationMiddleware(updateUserSchema),
  handler
);

export default router;
