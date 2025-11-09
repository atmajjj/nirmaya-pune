import {
  pgTable,
  serial,
  text,
  timestamp,
  boolean,
  integer,
  bigint,
  index,
} from 'drizzle-orm/pg-core';
import { users } from '../user/user.schema';

/**
 * Upload status enum values
 */
export const uploadStatuses = ['pending', 'processing', 'completed', 'failed'] as const;
export type UploadStatus = (typeof uploadStatuses)[number];

/**
 * Uploads table schema
 * Stores file upload information and metadata
 */
export const uploads = pgTable(
  'uploads',
  {
    id: serial('id').primaryKey(),
    user_id: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    filename: text('filename').notNull(),
    original_filename: text('original_filename').notNull(),
    mime_type: text('mime_type').notNull(),
    file_size: bigint('file_size', { mode: 'number' }).notNull(),
    file_path: text('file_path').notNull(),
    file_url: text('file_url').notNull(),
    status: text('status').$type<UploadStatus>().default('pending').notNull(),
    error_message: text('error_message'),
    created_by: integer('created_by').notNull(),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_by: integer('updated_by'),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
    is_deleted: boolean('is_deleted').default(false).notNull(),
    deleted_by: integer('deleted_by'),
    deleted_at: timestamp('deleted_at'),
  },
  table => ({
    userIdIsDeletedIdx: index('uploads_user_id_is_deleted_idx').on(table.user_id, table.is_deleted),
    statusIdx: index('uploads_status_idx').on(table.status),
    mimeTypeIdx: index('uploads_mime_type_idx').on(table.mime_type),
    createdAtIdx: index('uploads_created_at_idx').on(table.created_at),
  })
);

// Export types for TypeScript
export type Upload = typeof uploads.$inferSelect;
export type NewUpload = typeof uploads.$inferInsert;
