import { Request, Response, NextFunction } from 'express';
import HttpException from '../utils/httpException';
import { logger } from '../utils/logger';

const errorMiddleware = (
  error: HttpException,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction // Required by Express error middleware signature
) => {
  const requestId = (req as { requestId?: string }).requestId || 'unknown';
  const status: number = error.status || 500;
  const message: string = error.message || 'Something went wrong';

  // Create detailed error context
  const errorContext = {
    requestId,
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: (req as { userId?: string }).userId,
    timestamp: new Date().toISOString(),
    error: {
      name: error.name,
      message: error.message,
      status: status,
      stack:
        process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test'
          ? error.stack
          : undefined,
    },
  };

  // Log error with full context
  if (status >= 500) {
    logger.error('Server Error:', errorContext);
  } else {
    logger.warn('Client Error:', errorContext);
  }

  // Return structured error response
  res.status(status).json({
    success: false,
    error: {
      code: error.code || error.name || 'INTERNAL_ERROR',
      message: message,
      requestId: requestId,
      timestamp: errorContext.timestamp,
    },
  });
};

export default errorMiddleware;
