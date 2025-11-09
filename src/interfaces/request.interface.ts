import { Request } from 'express';
import { UserRole } from '../features/user/user.schema';

/**
 * Extended Request interfaces for middleware-specific properties
 * Central location for all Express Request interface extensions
 */

export interface RequestWithId extends Request {
  requestId: string;
}

export interface RequestWithUser extends Request {
  user?: IAuthUser;
  userId?: number;
  userRole?: UserRole;
  userAgent?: string;
  clientIP?: string;
  schema?: string;
}

// Combined interface for requests with both user and request ID context
export interface RequestWithContext extends Request, RequestWithId, RequestWithUser {}

export interface IAuthUser {
  id: number;
  name: string;
  email: string;
  phone_number?: string;
  role?: UserRole;
  created_at: Date;
  updated_at: Date;
}

export interface IAuthUserWithToken extends IAuthUser {
  token: string;
  refreshToken?: string;
}

export interface DataStoredInToken {
  id: number;
  email?: string;
  name?: string;
  role?: UserRole;
}

export interface TokenData {
  token: string;
  expiresIn: number;
}
