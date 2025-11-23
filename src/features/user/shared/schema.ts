import { pgTable, serial, text, timestamp, boolean, integer } from 'drizzle-orm/pg-core';

export const userRoles = ['admin', 'scientist', 'researcher', 'policymaker'] as const;
export type UserRole = (typeof userRoles)[number];

/**
 * Users table schema
 * Stores user account information
 */
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').unique().notNull(),
  password: text('password').notNull(),
  phone_number: text('phone_number'),
  role: text('role').$type<UserRole>().default('scientist').notNull(),
  created_by: integer('created_by').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_by: integer('updated_by'),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
  is_deleted: boolean('is_deleted').default(false).notNull(),
  deleted_by: integer('deleted_by'),
  deleted_at: timestamp('deleted_at'),
});

// Export types for TypeScript
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
