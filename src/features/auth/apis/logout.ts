/**
 * POST /api/v1/auth/logout
 * Logout user (Requires auth)
 */

import { Router, Response } from 'express';
import { requireAuth } from '../../../middlewares/auth.middleware';
import { requireRole } from '../../../middlewares/role.middleware';
import { ResponseFormatter } from '../../../utils/responseFormatter';
import { asyncHandler } from '../../../utils/controllerHelpers';
import { RequestWithUser } from '../../../interfaces/request.interface';

const handler = asyncHandler(async (req: RequestWithUser, res: Response) => {
  // For JWT, logout is client-side (remove token)
  // Can add server-side logic like token blacklisting if needed
  ResponseFormatter.success(res, null, 'Logout successful');
});

const router = Router();
router.post(
  '/logout',
  requireAuth,
  requireRole(['admin', 'scientist', 'researcher', 'policymaker']),
  handler
);

export default router;
