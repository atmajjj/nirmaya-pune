import { Request, Response, NextFunction } from 'express';
import HttpException from './httpException';

/**
 * Simple utility functions for common controller operations
 * These solve actual repeated patterns without forcing abstractions
 * 
 * Note: Express.Request types are augmented in src/interfaces/express.d.ts
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
export function getUserId(req: Request): number {
  const userId = req.userId;

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
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
