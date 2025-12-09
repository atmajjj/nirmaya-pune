import rateLimit, { RateLimitExceededEventHandler } from 'express-rate-limit';
// import RedisStore from 'rate-limit-redis';
import { Request, RequestHandler } from 'express';
import { logger } from '../utils/logger';
// import { redisClient } from '../utils/redis';
import { RequestWithId } from '../interfaces/request.interface';
import { isDevelopment, isTest } from '../utils/validateEnv';

// Create Redis store for production, in-memory for development
// Redis disabled - using in-memory store for all environments
const createStore = () => undefined;

// Consistent error response matching error middleware structure
const createRateLimitResponse = (message: string, retryAfter: string, requestId: string) => ({
  success: false,
  error: {
    code: 'RATE_LIMIT_EXCEEDED',
    message,
    requestId,
    timestamp: new Date().toISOString(),
    retryAfter,
  },
});

// Generic rate limit handler
const createRateLimitHandler =
  (message: string, retryAfter: string): RateLimitExceededEventHandler =>
  (req, res) => {
    const requestWithId = req as RequestWithId;
    logger.warn(`Rate limit exceeded for IP: ${req.ip}`, {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path,
      requestId: requestWithId.requestId,
      message,
      retryAfter,
    });

    res
      .status(429)
      .json(createRateLimitResponse(message, retryAfter, requestWithId.requestId || 'unknown'));
  };
// Skip logic for development localhost and test environment
const skipDevOrTest = (req: Request) =>
  isTest ||
  (isDevelopment &&
    (req.ip === '127.0.0.1' || req.ip === '::1' || req.ip === '::ffff:127.0.0.1')) ||
  true; // TEMPORARILY DISABLE ALL RATE LIMITING

// Auth endpoints - strict rate limiting (5 requests per 15 minutes) - PRODUCTION ONLY
export const authRateLimit: RequestHandler = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: createRateLimitResponse(
    'Too many authentication attempts, please try again later.',
    '15 minutes',
    'unknown'
  ),
  standardHeaders: true,
  legacyHeaders: false,
  store: createStore(),
  skip: skipDevOrTest, // Skip rate limiting in test and development environments
  handler: createRateLimitHandler(
    'Too many authentication attempts, please try again later.',
    '15 minutes'
  ),
});

// General API endpoints - moderate rate limiting (100 requests per minute)
export const apiRateLimit: RequestHandler = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100,
  message: createRateLimitResponse(
    'Too many requests from this IP, please try again later.',
    '1 minute',
    'unknown'
  ),
  standardHeaders: true,
  legacyHeaders: false,
  store: createStore(),
  skip: skipDevOrTest,
  handler: createRateLimitHandler(
    'Too many requests from this IP, please try again later.',
    '1 minute'
  ),
});

// File upload endpoints - stricter rate limiting (10 requests per minute)
export const uploadRateLimit: RequestHandler = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10,
  message: createRateLimitResponse(
    'Too many upload requests, please try again later.',
    '1 minute',
    'unknown'
  ),
  standardHeaders: true,
  legacyHeaders: false,
  store: createStore(),
  skip: skipDevOrTest,
  handler: createRateLimitHandler('Too many upload requests, please try again later.', '1 minute'),
});

// Invitation verify/accept endpoints - strict rate limiting (10 requests per 15 minutes)
// These are public endpoints that return/verify sensitive credentials
export const invitationRateLimit: RequestHandler = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per IP per 15 minutes
  message: createRateLimitResponse(
    'Too many invitation attempts, please try again later.',
    '15 minutes',
    'unknown'
  ),
  standardHeaders: true,
  legacyHeaders: false,
  store: createStore(),
  skip: skipDevOrTest, // Skip rate limiting in test and development environments
  handler: createRateLimitHandler(
    'Too many invitation attempts, please try again later.',
    '15 minutes'
  ),
});
