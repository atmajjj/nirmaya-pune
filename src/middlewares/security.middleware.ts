import helmet from 'helmet';
import { Request, Response, NextFunction } from 'express';

/**
 * Security middleware for API endpoints
 * Applies essential security headers without CSP (unnecessary for JSON APIs)
 *
 * Note: X-Response-Time header is not set here as it would be inaccurate
 * (security middleware runs early). Response time is available in request logs
 * via the request-logger middleware for monitoring and debugging purposes.
 */
export const securityMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  // Apply basic helmet security headers (without CSP)
  helmet({
    contentSecurityPolicy: false, // Disabled - CSP is for HTML rendering, not APIs
    crossOriginEmbedderPolicy: false, // Allow embedding for API docs
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },
  })(req, res, (err?: Error | null) => {
    if (err) {
      return next(err);
    }

    // Remove server information
    res.removeHeader('X-Powered-By');

    // Add custom security headers
    res.setHeader('X-API-Version', '1.0');

    next();
  });
};
