import { pgTable, serial, text, timestamp, boolean, integer, varchar, index } from 'drizzle-orm/pg-core';

export const userRoles = ['admin', 'scientist', 'researcher', 'policymaker', 'field_technician'] as const;
export type UserRole = (typeof userRoles)[number];

/**
 * Users table schema
 * Stores user account information
 *
 * Indexes:
 * - email_is_deleted_idx: Composite index for email lookups (most queries filter by is_deleted)
 * - role_is_deleted_idx: Composite index for role-based queries
 * - is_deleted_idx: Partial index for active user queries
 * - created_at_idx: For sorting/pagination
 */
export const users = pgTable(
  'users',
  {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    email: varchar('email', { length: 255 }).unique().notNull(),
    password: varchar('password', { length: 255 }).notNull(), // bcrypt hashes are ~60 chars
    phone_number: varchar('phone_number', { length: 20 }),
    role: text('role').$type<UserRole>().default('scientist').notNull(),
    // Audit fields - self-referential FKs added via raw SQL migration
    created_by: integer('created_by'),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_by: integer('updated_by'),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
    is_deleted: boolean('is_deleted').default(false).notNull(),
    deleted_by: integer('deleted_by'),
    deleted_at: timestamp('deleted_at'),
  },
  table => ({
    // Composite index for email lookups (queries always filter by is_deleted)
    emailIsDeletedIdx: index('users_email_is_deleted_idx').on(table.email, table.is_deleted),
    // Composite index for role-based queries
    roleIsDeletedIdx: index('users_role_is_deleted_idx').on(table.role, table.is_deleted),
    // Index for sorting/pagination
    createdAtIdx: index('users_created_at_idx').on(table.created_at),
  })
);

// Export types for TypeScript
// Note: Use IUser from ./interface.ts as the canonical type for user objects
// User type is kept for Drizzle internal usage only
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
