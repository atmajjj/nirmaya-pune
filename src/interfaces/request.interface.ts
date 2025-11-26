import { Request } from 'express';
import { UserRole } from '../features/user/shared/schema';

/**
 * Extended Request interfaces for type-safe middleware handling
 * 
 * Note: Base Express.Request is augmented in src/interfaces/express.d.ts
 * These interfaces provide stricter typing for specific middleware contexts
 */

/**
 * Request with guaranteed requestId (after request-id middleware)
 */
export interface RequestWithId extends Request {
  requestId: string;
}

/**
 * Request with guaranteed user authentication (after auth middleware)
 * Use this type in handlers that require authentication
 */
export interface RequestWithUser extends Request {
  userId: number;
  userRole: UserRole;
  userAgent?: string;
  clientIP?: string;
}

/**
 * Authenticated user data structure
 */
export interface IAuthUser {
  id: number;
  name: string;
  email: string;
  phone_number?: string;
  role?: UserRole;
  created_at: Date;
  updated_at: Date;
}

/**
 * User data with authentication tokens
 */
export interface IAuthUserWithToken extends IAuthUser {
  token: string;
  refreshToken?: string;
}

/**
 * JWT token payload structure
 */
export interface DataStoredInToken {
  id: number;
  email?: string;
  name?: string;
  role?: UserRole;
}
