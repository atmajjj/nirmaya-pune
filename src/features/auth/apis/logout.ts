/**
 * POST /api/auth/logout
 * Logout user and blacklist token (Requires auth)
 */

import { Router, Request, Response } from 'express';
import { requireAuth } from '../../../middlewares/auth.middleware';
import { ResponseFormatter } from '../../../utils/responseFormatter';
import { asyncHandler } from '../../../utils/controllerHelpers';
import { blacklistToken, getTokenTTL } from '../../../utils/tokenBlacklist';
import { verifyToken } from '../../../utils/jwt';
import { isRedisReady } from '../../../utils/redis';
import { logger } from '../../../utils/logger';
import { RequestWithUser } from '../../../interfaces/request.interface';

const handler = asyncHandler(async (req: Request, res: Response) => {
  const authHeader = req.headers['authorization'];
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    
    // Try to blacklist the token if Redis is available
    if (isRedisReady()) {
      try {
        const decoded = verifyToken(token);
        
        if (typeof decoded !== 'string' && decoded.exp) {
          const ttl = getTokenTTL(decoded.exp);
          await blacklistToken(token, ttl);
          logger.info('Token blacklisted on logout', { 
            userId: (req as RequestWithUser).userId,
            ttl 
          });
        }
      } catch (error) {
        // Token might already be expired, that's fine
        logger.warn('Could not blacklist token on logout', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    } else {
      logger.warn('Redis not available, token not blacklisted on logout');
    }
  }

  ResponseFormatter.success(res, null, 'Logout successful');
});

const router = Router();
// Only requireAuth needed - any authenticated user can logout
router.post('/logout', requireAuth, handler);

export default router;
