import {
  pgTable,
  serial,
  text,
  timestamp,
  boolean,
  integer,
  bigint,
  index,
  varchar,
} from 'drizzle-orm/pg-core';
import { users } from '../../user/shared/schema';

/**
 * Upload status enum values
 */
export const uploadStatuses = ['pending', 'processing', 'completed', 'failed'] as const;
export type UploadStatus = (typeof uploadStatuses)[number];

/**
 * Uploads table schema
 * Stores file upload information and metadata
 *
 * Indexes:
 * - user_id_is_deleted_idx: Composite for user's uploads (most common query)
 * - status_idx: For filtering by upload status
 * - mime_type_idx: For filtering by file type
 * - created_at_idx: For sorting/pagination
 */
export const uploads = pgTable(
  'uploads',
  {
    id: serial('id').primaryKey(),
    user_id: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    filename: varchar('filename', { length: 255 }).notNull(),
    original_filename: varchar('original_filename', { length: 255 }).notNull(),
    mime_type: varchar('mime_type', { length: 100 }).notNull(),
    file_size: bigint('file_size', { mode: 'number' }).notNull(),
    file_path: text('file_path').notNull(), // S3 paths can be long
    file_url: text('file_url').notNull(), // URLs can be long
    status: text('status').$type<UploadStatus>().default('pending').notNull(),
    error_message: text('error_message'),
    // Audit fields
    created_by: integer('created_by'), // Nullable for consistency with users table
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_by: integer('updated_by'),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
    is_deleted: boolean('is_deleted').default(false).notNull(),
    deleted_by: integer('deleted_by'),
    deleted_at: timestamp('deleted_at'),
  },
  table => ({
    // Composite index for user's uploads (most common query pattern)
    userIdIsDeletedIdx: index('uploads_user_id_is_deleted_idx').on(table.user_id, table.is_deleted),
    // For filtering by status
    statusIdx: index('uploads_status_idx').on(table.status),
    // For filtering by file type
    mimeTypeIdx: index('uploads_mime_type_idx').on(table.mime_type),
    // For sorting/pagination
    createdAtIdx: index('uploads_created_at_idx').on(table.created_at),
  })
);

// Export types for TypeScript
export type Upload = typeof uploads.$inferSelect;
export type NewUpload = typeof uploads.$inferInsert;
