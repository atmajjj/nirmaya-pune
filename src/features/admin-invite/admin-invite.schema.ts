import { pgTable, serial, text, timestamp, integer, boolean } from 'drizzle-orm/pg-core';
import { userRoles } from '../user/user.schema';

export const invitationStatuses = ['pending', 'accepted', 'revoked', 'expired'] as const;
export type InvitationStatus = (typeof invitationStatuses)[number];

/**
 * Admin invitations table schema
 * Stores invitation data for admin-created user accounts
 */
export const invitations = pgTable('invitation', {
  invitation_id: serial('invitation_id').primaryKey(),

  // Invitee details
  first_name: text('first_name').notNull(),
  last_name: text('last_name').notNull(),
  email: text('email').unique().notNull(),

  // Invitation details
  invite_token: text('invite_token').notNull(),
  status: text('status').$type<InvitationStatus>().default('pending').notNull(),

  // Role assignment (will be assigned when user accepts invite)
  assigned_role: text('assigned_role').$type<typeof userRoles[number]>(),

  // Security
  password: text('password'), // Temporary password for invite

  // Relationships
  invited_by: integer('invited_by').notNull(),

  // Timestamps
  expires_at: timestamp('expires_at').notNull(),
  accepted_at: timestamp('accepted_at'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),

  // Audit
  is_deleted: boolean('is_deleted').default(false).notNull(),
});

// Export types for TypeScript
export type Invitation = typeof invitations.$inferSelect;
export type NewInvitation = typeof invitations.$inferInsert;