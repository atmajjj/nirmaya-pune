import { Request, Response, NextFunction } from 'express';
import { v4 as generateUuid } from '../utils/uuid';
import { RequestWithId } from '../interfaces/request.interface';

/**
 * Request ID middleware for distributed tracing
 * Generates or uses existing request ID from headers
 */
export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Use existing request ID from header or generate new one
  const requestId = (req.headers['x-request-id'] as string) || generateUuid();

  // Add to request object for use in other middlewares/controllers
  (req as RequestWithId).requestId = requestId;

  // Add to response headers for client reference
  res.setHeader('X-Request-ID', requestId);

  next();
};
