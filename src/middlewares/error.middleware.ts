import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import HttpException from '../utils/httpException';
import { logger } from '../utils/logger';
import { isDevelopment } from '../utils/validateEnv';

const errorMiddleware = (
  error: HttpException | ZodError | Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
) => {
  const requestId = req.requestId || 'unknown';

  // Handle ZodError (validation errors from inline schema parsing)
  if (error instanceof ZodError) {
    const errorMessages = error.issues
      .map(issue => `${issue.path.join('.')}: ${issue.message}`)
      .join(', ');

    logger.info('Validation failed', {
      requestId,
      method: req.method,
      url: req.url,
      errors: error.issues,
    });

    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: errorMessages,
        requestId: requestId,
        timestamp: new Date().toISOString(),
      },
    });
  }

  const httpError = error as HttpException;
  const status: number = httpError.status || 500;
  const message: string = error.message || 'Something went wrong';

  // Create detailed error context
  const errorContext = {
    requestId,
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.userId,
    timestamp: new Date().toISOString(),
    error: {
      name: error.name,
      message: error.message,
      status: status,
      stack:
        isDevelopment
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
  return res.status(status).json({
    success: false,
    error: {
      code: httpError.code || error.name || 'INTERNAL_ERROR',
      message: message,
      requestId: requestId,
      timestamp: errorContext.timestamp,
    },
  });
};

export default errorMiddleware;
