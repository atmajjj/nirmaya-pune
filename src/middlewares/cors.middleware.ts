import cors from 'cors';
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { config } from '../utils/validateEnv';

/**
 * Get allowed origins from environment or use defaults
 */
const getAllowedOrigins = (): string[] => {
  return config.ALLOWED_ORIGINS.split(',').map(origin => origin.trim());
};

/**
 * CORS middleware using the standard cors package
 * Configured for security with environment-based allowed origins
 */
export const corsMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const allowedOrigins = getAllowedOrigins();
  const origin = req.headers.origin;

  // Log rejected origins for monitoring (before cors handles it)
  if (origin && !allowedOrigins.includes(origin)) {
    logger.warn(`CORS: Rejected origin ${origin}`, {
      origin,
      allowedOrigins,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      requestId: req.requestId,
    });
  }

  // Use cors package with proper configuration
  const corsHandler = cors({
    origin: (origin, callback) => {
      // Allow requests without origin (like Postman, mobile apps, server-to-server)
      if (!origin) {
        return callback(null, true);
      }

      // Check if origin is allowed
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // Reject unauthorized origins
      // Note: CORS package expects Error instances, not custom exceptions
      // The error middleware will handle converting this to proper HttpException response
      return callback(new Error('CORS: Origin not allowed'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
    maxAge: 86400, // 24 hours
    optionsSuccessStatus: 200, // Some legacy browsers choke on 204
  });

  corsHandler(req, res, next);
};
