import { NextFunction, Response } from "express";
import jwt from "jsonwebtoken";
import HttpException from "../exceptions/HttpException";
import {
  DataStoredInToken,
  RequestWithUser,
} from "../interfaces/auth.interface";

// Define allowed database schemas to prevent SQL injection
const ALLOWED_SCHEMAS = ["public", "tenant1", "tenant2", "admin"];

// Define routes that don't require authentication
const EXEMPT_ROUTES = [
  "/users/register",
  "/users/login",
  "/health",
  "/api-docs",
  "/api-docs.json",
];

// Helper function to check if route is exempt from authentication
const isExemptRoute = (path: string): boolean => {
  return EXEMPT_ROUTES.includes(path) || path.startsWith("/api-docs");
};

const authMiddleware = async (
  req: RequestWithUser,
  res: Response,
  next: NextFunction
) => {
  try {
    // Import DB inside the function to avoid early connection attempts
    const { default: DB } = await import("../../database/index.schema");

    // Check if the current route is exempt from authentication
    if (isExemptRoute(req.path)) {
      await DB.raw("SET search_path TO ??", ["public"]);
      return next();
    }

    const bearerHeader = req.headers["authorization"];

    if (bearerHeader) {
      const bearer = bearerHeader.split(" ");
      const bearerToken = bearer[1];
      const requestedSchema = bearer[2];

      if (bearerToken && bearerToken !== "null") {
        const secret = process.env.JWT_SECRET;
        if (!secret) {
          return next(new HttpException(500, "JWT secret not configured"));
        }

        const verificationResponse = (await jwt.verify(
          bearerToken,
          secret
        )) as DataStoredInToken;

        if (verificationResponse) {
          // Validate and sanitize schema name to prevent SQL injection
          const safeSchema = ALLOWED_SCHEMAS.includes(requestedSchema)
            ? requestedSchema
            : "public";

          await DB.raw("SET search_path TO ??", [safeSchema]);

          // Attach user ID to request for use in controllers
          // Note: Full user object should be fetched in controllers when needed
          req.userId = verificationResponse.id;
          next();
        } else {
          next(new HttpException(401, "Invalid authentication token"));
        }
      } else {
        next(new HttpException(401, "Invalid authentication token format"));
      }
    } else {
      next(new HttpException(401, "Authentication token missing"));
    }
  } catch (error) {
    // Log the actual error for debugging (but don't expose to client)
    console.error("Auth middleware error:", error);

    // Provide more specific error messages based on JWT errors
    if (error instanceof jwt.JsonWebTokenError) {
      next(new HttpException(401, "Invalid authentication token"));
    } else if (error instanceof jwt.TokenExpiredError) {
      next(new HttpException(401, "Authentication token expired"));
    } else {
      next(new HttpException(401, "Authentication failed"));
    }
  }
};

export default authMiddleware;
