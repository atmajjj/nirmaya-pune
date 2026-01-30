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
  jsonb,
} from 'drizzle-orm/pg-core';
import { users } from '../../user/shared/schema';
import { uploads } from '../../upload/shared/schema';

/**
 * Data source status enum values
 */
export const dataSourceStatuses = ['pending', 'available', 'processing', 'archived', 'failed'] as const;
export type DataSourceStatus = (typeof dataSourceStatuses)[number];

/**
 * File type enum values
 */
export const fileTypes = ['csv', 'xlsx', 'xls'] as const;
export type FileType = (typeof fileTypes)[number];

/**
 * Data Sources table schema
 * Stores CSV/Excel files uploaded by field technicians
 * Scientists can view and use these files for Nirmaya calculations
 *
 * Indexes:
 * - uploaded_by_is_deleted_idx: For field technician's uploads
 * - status_is_deleted_idx: For filtering by status
 * - file_type_idx: For filtering by file type
 * - created_at_idx: For sorting/pagination
 */
export const dataSources = pgTable(
  'data_sources',
  {
    id: serial('id').primaryKey(),
    
    // File information
    filename: varchar('filename', { length: 255 }).notNull(),
    original_filename: varchar('original_filename', { length: 255 }).notNull(),
    file_type: text('file_type').$type<FileType>().notNull(),
    mime_type: varchar('mime_type', { length: 100 }).notNull(),
    file_size: bigint('file_size', { mode: 'number' }).notNull(),
    file_path: text('file_path').notNull(), // S3 path
    file_url: text('file_url').notNull(), // S3 URL
    
    // Uploader information
    uploaded_by: integer('uploaded_by')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    
    // Status tracking
    status: text('status').$type<DataSourceStatus>().default('pending').notNull(),
    error_message: text('error_message'),
    
    // Metadata (extracted from file)
    metadata: jsonb('metadata').$type<{
      total_rows?: number;
      column_count?: number;
      columns?: string[];
      stations?: string[];
      date_range?: { from?: string; to?: string };
      preview_rows?: number;
    }>(),
    
    // Description/notes from field technician
    description: text('description'),
    
    // Auto-calculation tracking
    calculation_status: text('calculation_status')
      .$type<'not_started' | 'calculating' | 'completed' | 'failed'>()
      .default('not_started')
      .notNull(),
    calculation_upload_id: integer('calculation_upload_id')
      .references(() => uploads.id, { onDelete: 'set null' }),
    calculation_error: text('calculation_error'),
    calculation_completed_at: timestamp('calculation_completed_at'),
    calculated_indices: jsonb('calculated_indices').$type<{
      wqi?: boolean;
      hpi?: boolean;
      mi?: boolean;
    }>(),
    
    // Audit fields
    created_by: integer('created_by'),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_by: integer('updated_by'),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
    is_deleted: boolean('is_deleted').default(false).notNull(),
    deleted_by: integer('deleted_by'),
    deleted_at: timestamp('deleted_at'),
  },
  table => ({
    // Composite index for field technician's uploads
    uploadedByIsDeletedIdx: index('data_sources_uploaded_by_is_deleted_idx').on(
      table.uploaded_by,
      table.is_deleted
    ),
    // For filtering by status
    statusIsDeletedIdx: index('data_sources_status_is_deleted_idx').on(
      table.status,
      table.is_deleted
    ),
    // For filtering by file type
    fileTypeIdx: index('data_sources_file_type_idx').on(table.file_type),
    // For sorting/pagination
    createdAtIdx: index('data_sources_created_at_idx').on(table.created_at),
    // For filtering by calculation status
    calculationStatusIdx: index('data_sources_calculation_status_idx').on(table.calculation_status),
  })
);

// Export types for TypeScript
export type DataSource = typeof dataSources.$inferSelect;
export type NewDataSource = typeof dataSources.$inferInsert;
