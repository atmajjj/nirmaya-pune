import { pgTable, serial, text, timestamp, integer, boolean, varchar, index } from 'drizzle-orm/pg-core';
import { userRoles, users } from '../../user/shared/schema';

export const invitationStatuses = ['pending', 'accepted', 'revoked', 'expired'] as const;
export type InvitationStatus = (typeof invitationStatuses)[number];

/**
 * Admin invitations table schema
 * Stores invitation data for admin-created user accounts
 *
 * Indexes:
 * - invite_token_idx: For token lookup during invite acceptance (critical path)
 * - email_is_deleted_idx: Composite index for email lookups
 * - status_is_deleted_idx: Composite index for status filtering
 * - expires_at_idx: For cleanup/expiration queries
 * - invited_by_idx: For admin to see their invitations
 */
export const invitations = pgTable(
  'invitation',
  {
    id: serial('id').primaryKey(),

    // Invitee details
    first_name: varchar('first_name', { length: 100 }).notNull(),
    last_name: varchar('last_name', { length: 100 }).notNull(),
    email: varchar('email', { length: 255 }).unique().notNull(),

    // Invitation details
    invite_token: varchar('invite_token', { length: 64 }).notNull(), // UUID or hash token
    status: text('status').$type<InvitationStatus>().default('pending').notNull(),

    // Role assignment (will be assigned when user accepts invite)
    assigned_role: text('assigned_role').$type<(typeof userRoles)[number]>(),

    // Security - stores encrypted temp password (can be decrypted for user verification)
    temp_password_encrypted: text('temp_password_encrypted'), // AES-256-GCM encrypted
    password_hash: varchar('password_hash', { length: 255 }), // bcrypt hash for login verification
    verify_attempts: integer('verify_attempts').default(0).notNull(), // Brute force protection

    // Relationships - FK to users table
    invited_by: integer('invited_by')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),

    // Timestamps
    expires_at: timestamp('expires_at').notNull(),
    accepted_at: timestamp('accepted_at'),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull(),

    // Audit fields (consistent with other tables)
    is_deleted: boolean('is_deleted').default(false).notNull(),
    deleted_by: integer('deleted_by'),
    deleted_at: timestamp('deleted_at'),
  },
  table => ({
    // Critical: Token lookup for invite acceptance (must be fast)
    inviteTokenIdx: index('invitation_invite_token_idx').on(table.invite_token),
    // Composite index for email lookups
    emailIsDeletedIdx: index('invitation_email_is_deleted_idx').on(table.email, table.is_deleted),
    // Composite index for status filtering
    statusIsDeletedIdx: index('invitation_status_is_deleted_idx').on(table.status, table.is_deleted),
    // For expiration cleanup queries
    expiresAtIdx: index('invitation_expires_at_idx').on(table.expires_at),
    // For admin to list their invitations
    invitedByIdx: index('invitation_invited_by_idx').on(table.invited_by),
  })
);

// Export types for TypeScript
export type Invitation = typeof invitations.$inferSelect;
export type NewInvitation = typeof invitations.$inferInsert;
