import { pgTable, text, timestamp, uuid, boolean, varchar, integer } from 'drizzle-orm/pg-core';
import { users } from '../../user/shared/schema';

export const applicationStatuses = ['pending', 'accepted', 'rejected'] as const;
export type ApplicationStatus = (typeof applicationStatuses)[number];

/**
 * Researcher applications table schema
 * Stores application data for users who want to join as researchers
 */
export const researcherApplications = pgTable('researcher_applications', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  // Applicant details
  full_name: varchar('full_name', { length: 200 }).notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  phone_number: varchar('phone_number', { length: 20 }).notNull(),
  organization: varchar('organization', { length: 255 }).notNull(),
  purpose: text('purpose').notNull(),
  
  // Application status
  status: text('status').$type<ApplicationStatus>().default('pending').notNull(),
  
  // Admin review details
  reviewed_by: integer('reviewed_by').references(() => users.id),
  reviewed_at: timestamp('reviewed_at'),
  rejection_reason: text('rejection_reason'),
  
  // Invitation details (set when accepted)
  invite_token: varchar('invite_token', { length: 64 }),
  invite_sent_at: timestamp('invite_sent_at'),
  
  // Audit fields
  created_by: uuid('created_by'), // null for public submissions
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_by: uuid('updated_by'),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
  is_deleted: boolean('is_deleted').default(false).notNull(),
  deleted_by: uuid('deleted_by'),
  deleted_at: timestamp('deleted_at'),
});

export type ResearcherApplication = typeof researcherApplications.$inferSelect;
export type NewResearcherApplication = typeof researcherApplications.$inferInsert;