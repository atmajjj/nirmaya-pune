import { NextFunction, Response, Request } from 'express';
import HttpException from '../utils/httpException';
import { logger } from '../utils/logger';
import { DataStoredInToken } from '../interfaces/request.interface';
import { verifyToken } from '../utils/jwt';
import { isTokenBlacklisted } from '../utils/tokenBlacklist';
import { isRedisReady } from '../utils/redis';

/**
 * Authentication middleware - requires valid JWT token
 * Checks token blacklist if Redis is available
 */
export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers['authorization'];
    const userAgent = req.headers['user-agent'] || 'Unknown';
    const clientIP = req.ip || req.connection?.remoteAddress || 'Unknown';

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warn('Authentication failed: Missing or invalid authorization header', {
        ip: clientIP,
        userAgent,
        url: req.originalUrl,
        method: req.method,
      });
      return next(new HttpException(401, 'Authentication required. No token provided.'));
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    if (!token || token === 'null') {
      logger.warn('Authentication failed: Null token provided', {
        ip: clientIP,
        userAgent,
        url: req.originalUrl,
        method: req.method,
      });
      return next(new HttpException(401, 'Authentication required. No token provided.'));
    }

    // Check if token is blacklisted (only if Redis is available)
    if (isRedisReady()) {
      const blacklisted = await isTokenBlacklisted(token);
      if (blacklisted) {
        logger.warn('Authentication failed: Token is blacklisted (logged out)', {
          ip: clientIP,
          userAgent,
          url: req.originalUrl,
          method: req.method,
        });
        return next(new HttpException(401, 'Token has been revoked. Please login again.'));
      }
    }

    const verificationResponse = verifyToken(token);

    // Validate token payload structure
    if (typeof verificationResponse === 'string') {
      logger.warn('Authentication failed: Invalid token payload structure', {
        ip: clientIP,
        userAgent,
        url: req.originalUrl,
        method: req.method,
      });
      return next(new HttpException(401, 'Invalid token payload'));
    }

    const decoded = verificationResponse as DataStoredInToken;

    // Validate required fields exist
    if (!decoded.id || !decoded.role) {
      logger.warn('Authentication failed: Missing required token fields', {
        ip: clientIP,
        userAgent,
        url: req.originalUrl,
        method: req.method,
        decodedFields: Object.keys(decoded),
      });
      return next(new HttpException(401, 'Invalid token payload'));
    }

    // Attach user information to request
    req.userId = decoded.id;
    req.userRole = decoded.role;
    req.userAgent = userAgent;
    req.clientIP = clientIP;

    // Log successful authentication
    logger.info('Authentication successful', {
      userId: decoded.id,
      userRole: decoded.role,
      ip: clientIP,
      userAgent: userAgent.substring(0, 100), // Truncate for logging
      url: req.originalUrl,
      method: req.method,
    });

    next();
  } catch (error) {
    logger.error('Auth middleware error:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      ip: req.ip || req.connection?.remoteAddress || 'Unknown',
      userAgent: req.headers['user-agent'] || 'Unknown',
      url: req.originalUrl,
      method: req.method,
    });

    // If it's already an HttpException, pass it through
    if (error instanceof HttpException) {
      return next(error);
    }

    // Handle specific JWT errors
    if (error instanceof Error && error.name === 'TokenExpiredError') {
      return next(new HttpException(401, 'Token expired'));
    }

    if (error instanceof Error && error.name === 'JsonWebTokenError') {
      return next(new HttpException(401, 'Invalid token'));
    }

    if (error instanceof Error && error.name === 'NotBeforeError') {
      return next(new HttpException(401, 'Token not active'));
    }

    // Generic auth error for other cases
    next(new HttpException(401, 'Authentication failed'));
  }
};

export default requireAuth;
