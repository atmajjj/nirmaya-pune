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
import { uploads } from '../../upload/shared/schema';
import { users } from '../../user/shared/schema';

/**
 * Report type enum values
 */
export const reportTypes = ['comprehensive', 'summary'] as const;
export type ReportType = (typeof reportTypes)[number];

/**
 * Report status enum values
 */
export const reportStatuses = ['pending', 'generating', 'completed', 'failed'] as const;
export type ReportStatus = (typeof reportStatuses)[number];

/**
 * HMPI Reports table schema
 * Stores metadata for generated HMPI water quality reports
 *
 * Indexes:
 * - upload_id_idx: For fetching reports by upload
 * - status_idx: For filtering by generation status
 * - created_by_idx: For user-scoped queries
 * - created_at_idx: For sorting/pagination
 */
export const hmpiReports = pgTable(
  'hmpi_reports',
  {
    id: serial('id').primaryKey(),

    // Reference to uploaded file
    upload_id: integer('upload_id')
      .notNull()
      .references(() => uploads.id, { onDelete: 'cascade' }),

    // Report metadata
    report_title: varchar('report_title', { length: 255 }).notNull(),
    report_type: text('report_type').$type<ReportType>().default('comprehensive').notNull(),

    // File information (stored in S3)
    file_name: varchar('file_name', { length: 255 }).notNull(),
    file_path: text('file_path').notNull(), // S3 path
    file_url: text('file_url').notNull(), // S3 presigned URL
    file_size: bigint('file_size', { mode: 'number' }).notNull(),

    // Cached statistics for quick access
    total_stations: integer('total_stations').notNull(),
    avg_hpi: text('avg_hpi'), // Stored as string for precision
    avg_mi: text('avg_mi'),
    avg_wqi: text('avg_wqi'),

    // Generation status tracking
    status: text('status').$type<ReportStatus>().default('pending').notNull(),
    error_message: text('error_message'),
    generated_at: timestamp('generated_at'),

    // Audit fields
    created_by: integer('created_by')
      .notNull()
      .references(() => users.id),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_by: integer('updated_by').references(() => users.id),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
    is_deleted: boolean('is_deleted').default(false).notNull(),
    deleted_by: integer('deleted_by').references(() => users.id),
    deleted_at: timestamp('deleted_at'),
  },
  table => ({
    // For fetching reports by upload
    uploadIdIdx: index('hmpi_reports_upload_id_idx').on(table.upload_id),
    // For filtering by status
    statusIdx: index('hmpi_reports_status_idx').on(table.status),
    // For user-scoped queries
    createdByIdx: index('hmpi_reports_created_by_idx').on(table.created_by),
    // For sorting/pagination
    createdAtIdx: index('hmpi_reports_created_at_idx').on(table.created_at),
    // For filtering non-deleted reports
    isDeletedIdx: index('hmpi_reports_is_deleted_idx').on(table.is_deleted),
  })
);

// Export types for TypeScript (using DB prefix to avoid conflicts with interface types)
export type HMPIReportDB = typeof hmpiReports.$inferSelect;
export type NewHMPIReportDB = typeof hmpiReports.$inferInsert;
