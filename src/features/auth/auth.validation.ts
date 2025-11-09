import { z } from 'zod';
import { userRoles } from '../user/user.schema';

// User creation schema for registration
export const createUserSchema = z.object({
  id: z.number().optional(),
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email format'),
  phone_number: z.string().optional(),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
  role: z.enum(userRoles).default('user').optional(),
  created_by: z.number().optional(),
  updated_by: z.number().optional(),
  is_deleted: z.boolean().optional(),
  deleted_by: z.number().optional(),
});

// User login schema
export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

// Refresh token schema
export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

// Type exports
export type CreateUser = z.infer<typeof createUserSchema>;
export type Login = z.infer<typeof loginSchema>;
export type RefreshToken = z.infer<typeof refreshTokenSchema>;
