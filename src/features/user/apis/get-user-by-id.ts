/**
 * GET /api/v1/users/:id
 * Get user by ID (Requires auth)
 */

import { Router, Response } from 'express';
import { Request } from 'express';
import { requireAuth } from '../../../middlewares/auth.middleware';
import { requireRole } from '../../../middlewares/role.middleware';
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
router.get(
  '/:id',
  requireAuth,
  requireRole(['admin', 'scientist', 'researcher', 'policymaker']),
  handler
);

export default router;
