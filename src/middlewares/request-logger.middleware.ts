import { Request, Response, NextFunction } from 'express';
import morgan from 'morgan';
import { stream } from '../utils/logger';
import { isProduction } from '../utils/validateEnv';

/**
 * Unified request logging middleware using Morgan with custom tokens
 * Provides consistent, structured logging without memory leaks
 * Response time is logged but not set as header (headers sent before logging occurs)
 */

// Custom Morgan tokens for enhanced logging
morgan.token('request-id', (req: Request) => {
  return req.requestId || 'unknown';
});

morgan.token('user-id', (req: Request) => {
  return req.userId?.toString() || 'anonymous';
});

morgan.token('user-role', (req: Request) => {
  return req.userRole || 'anonymous';
});

/**
 * Unified request logging middleware
 * Uses Morgan with custom tokens for consistent, structured logging
 */
export const requestLoggerMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (isProduction) {
    // JSON format for production with comprehensive structured data
    return morgan(
      (tokens: morgan.TokenIndexer, req: Request, res: Response) => {
        return JSON.stringify({
          timestamp: tokens.date(req, res, 'iso'),
          level: 'http',
          method: tokens.method(req, res),
          url: tokens.url(req, res),
          status: parseInt(tokens.status(req, res) || '0', 10),
          responseTime: parseFloat(tokens['response-time'](req, res) || '0'),
          requestId: tokens['request-id'](req, res),
          userId: tokens['user-id'](req, res),
          userRole: tokens['user-role'](req, res),
          userAgent: tokens['user-agent'](req, res),
          ip: tokens['remote-addr'](req, res),
          contentLength: tokens.res(req, res, 'content-length') || '0',
          service: 'nirmaya-backend',
        });
      },
      { stream }
    )(req, res, next);
  } else {
    // Development format with request ID and user context
    return morgan(
      (tokens: morgan.TokenIndexer, req: Request, res: Response) => {
        const requestId = tokens['request-id'](req, res);
        const userId = tokens['user-id'](req, res);
        const method = tokens.method(req, res);
        const url = tokens.url(req, res);
        const status = tokens.status(req, res);
        const responseTime = tokens['response-time'](req, res);

        return `${requestId} ${userId} ${method} ${url} ${status} ${responseTime}ms`;
      },
      { stream }
    )(req, res, next);
  }
};
