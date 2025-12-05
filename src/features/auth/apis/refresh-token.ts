/**
 * POST /api/auth/refresh-token
 * Refresh access token (Requires auth)
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import validationMiddleware from '../../../middlewares/validation.middleware';
import { authRateLimit } from '../../../middlewares/rate-limit.middleware';
import { ResponseFormatter } from '../../../utils/responseFormatter';
import { asyncHandler } from '../../../utils/controllerHelpers';
import HttpException from '../../../utils/httpException';
import { verifyToken, generateAccessToken, generateRefreshToken } from '../../../utils/jwt';
import { findUserById } from '../../user/shared/queries';
import { IAuthUserWithToken } from '../../../interfaces/request.interface';

const schema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

async function handleRefreshToken(refreshToken: string): Promise<IAuthUserWithToken> {
  const decoded = verifyToken(refreshToken);

  if (typeof decoded === 'string' || !decoded.id) {
    throw new HttpException(401, 'Invalid refresh token format');
  }

  const user = await findUserById(decoded.id);
  if (!user) {
    throw new HttpException(404, 'User not found');
  }

  const accessToken = generateAccessToken({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  });

  const newRefreshToken = generateRefreshToken({
    id: user.id,
  });

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone_number: user.phone_number || undefined,
    role: user.role,
    created_at: user.created_at,
    updated_at: user.updated_at,
    token: accessToken,
    refreshToken: newRefreshToken,
  };
}

const handler = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    throw new HttpException(400, 'Refresh token is required');
  }

  const result = await handleRefreshToken(refreshToken);

  ResponseFormatter.success(res, result, 'Token refreshed successfully');
});

const router = Router();
// No auth required - the refresh token itself is validated
// Rate limited to prevent abuse (same as auth endpoints)
router.post('/refresh-token', authRateLimit, validationMiddleware(schema), handler);

export default router;
