import { z } from 'zod';
import { userRoles } from './user.schema';

// User update schema
export const updateUserSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  email: z.string().email('Invalid email format').optional(),
  phone_number: z.string().optional(),
  password: z.string().min(8, 'Password must be at least 8 characters long').optional(),
  role: z.enum(userRoles).optional(),
  updated_by: z.number().optional(),
});

// Type exports
export type UpdateUser = z.infer<typeof updateUserSchema>;
