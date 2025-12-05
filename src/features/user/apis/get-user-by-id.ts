/**
 * GET /api/users/:id
 * Get user by ID (Requires auth)
 */

import { Router, Request, Response } from 'express';
import { requireAuth } from '../../../middlewares/auth.middleware';
import { ResponseFormatter } from '../../../utils/responseFormatter';
import { asyncHandler, parseIdParam } from '../../../utils/controllerHelpers';
import { sanitizeUser } from '../../../utils/sanitizeUser';
import HttpException from '../../../utils/httpException';
import { findUserById } from '../shared/queries';
import { IUser } from '../shared/interface';

async function getUserById(id: number): Promise<IUser> {
  const user = await findUserById(id);

  if (!user) {
    throw new HttpException(404, 'User not found');
  }

  return user as IUser;
}

const handler = asyncHandler(async (req: Request, res: Response) => {
  const id = parseIdParam(req);
  const user = await getUserById(id);
  const userResponse = sanitizeUser(user);

  ResponseFormatter.success(res, userResponse, 'User retrieved successfully');
});

const router = Router();
router.get('/:id', requireAuth, handler);

export default router;
