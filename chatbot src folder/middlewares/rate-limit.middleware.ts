import rateLimit from "express-rate-limit";
import { RequestHandler } from "express";

// Development: Increase rate limit for easier testing
const rateLimitMiddleware: RequestHandler = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10000, // allow 10,000 requests per minute per IP
  message: {
    error: "Too many requests from this IP, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export default rateLimitMiddleware;
