import { Request, Response, NextFunction } from 'express';
import { RequestWithUser } from '../interfaces/request.interface';
import HttpException from './httpException';

/**
 * Simple utility functions for common controller operations
 * These solve actual repeated patterns without forcing abstractions
 */

/**
 * Parse and validate ID parameter from request
 * Used in every getById, update, delete operation
 */
export function parseIdParam(req: Request, paramName: string = 'id'): number {
  const id = Number(req.params[paramName]);

  if (isNaN(id) || id <= 0) {
    throw new HttpException(400, `Invalid ${paramName} parameter`);
  }

  return id;
}

/**
 * Extract authenticated user ID from request
 * Used in every controller that needs user context
 */
export function getUserId(req: RequestWithUser): number {
  const userId = req.userId || req.user?.id;

  if (!userId) {
    throw new HttpException(401, 'User authentication required');
  }

  return userId;
}

/**
 * Wrapper for async controller methods to handle errors consistently
 * Eliminates the need to write try-catch in every method
 */
export function asyncHandler(
  fn: (req: Request | RequestWithUser, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: Request | RequestWithUser, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
