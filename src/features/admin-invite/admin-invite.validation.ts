import { z } from 'zod';
import { userRoles } from '../user/user.schema';

// Create invitation schema
export const createInvitationSchema = z.object({
  first_name: z.string().min(1, 'First name is required').max(255, 'First name too long'),
  last_name: z.string().min(1, 'Last name is required').max(255, 'Last name too long'),
  email: z.string().email('Invalid email format'),
  assigned_role: z.enum(userRoles),
});

// Accept invitation schema
export const acceptInvitationSchema = z.object({
  token: z.string().min(1, 'Invitation token is required'),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
});

// Get invitations query schema
export const getInvitationsQuerySchema = z.object({
  status: z.enum(['pending', 'accepted', 'revoked', 'expired']).optional(),
  page: z.string().transform(val => parseInt(val)).refine(val => val > 0, 'Page must be positive').optional(),
  limit: z.string().transform(val => parseInt(val)).refine(val => val > 0 && val <= 100, 'Limit must be between 1 and 100').optional(),
});

// Type exports
export type CreateInvitation = z.infer<typeof createInvitationSchema>;
export type AcceptInvitation = z.infer<typeof acceptInvitationSchema>;
export type GetInvitationsQuery = z.infer<typeof getInvitationsQuerySchema>;