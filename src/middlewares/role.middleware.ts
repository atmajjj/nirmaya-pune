import { NextFunction, Response, Request } from 'express';
import HttpException from '../utils/httpException';
import { logger } from '../utils/logger';
// Import to ensure global Express interface extension is loaded
import '../interfaces/request.interface';
import { UserRole } from '../features/user/shared/schema';

/**
 * Role-based authorization middleware factory
 * Usage: requireRole('admin'), requireRole(['admin', 'moderator'])
 */
export const requireRole = (allowedRoles: UserRole | UserRole[]) => {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.userId) {
        return next(new HttpException(401, 'Authentication required'));
      }

      if (!req.userRole) {
        return next(new HttpException(403, 'User role not found'));
      }

      if (!roles.includes(req.userRole as UserRole)) {
        return next(new HttpException(403, `Access denied. Required role: ${roles.join(' or ')}`));
      }

      next();
    } catch (error) {
      logger.error('Role check error:', error);
      next(new HttpException(403, 'Authorization failed'));
    }
  };
};
