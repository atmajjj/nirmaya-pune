import {
  pgTable,
  serial,
  text,
  timestamp,
  boolean,
  integer,
  decimal,
  index,
  varchar,
} from 'drizzle-orm/pg-core';
import { users } from '../../user/shared/schema';
import { uploads } from '../../upload/shared/schema';

/**
 * HPI Classification enum values
 */
export const hpiClassifications = [
  'Excellent - Low pollution',
  'Good - Low to medium pollution',
  'Poor - Medium pollution',
  'Very Poor - High pollution',
  'Unsuitable - Critical pollution',
] as const;
export type HPIClassification = (typeof hpiClassifications)[number];

/**
 * MI Classification enum values
 */
export const miClassifications = [
  'Very Pure',
  'Pure',
  'Slightly Affected',
  'Moderately Affected',
  'Strongly Affected',
  'Seriously Affected',
] as const;
export type MIClassification = (typeof miClassifications)[number];

/**
 * MI Class enum values
 */
export const miClasses = ['Class I', 'Class II', 'Class III', 'Class IV', 'Class V', 'Class VI'] as const;
export type MIClass = (typeof miClasses)[number];

/**
 * Calculation status enum values
 */
export const calculationStatuses = ['pending', 'processing', 'completed', 'failed', 'partial'] as const;
export type CalculationStatus = (typeof calculationStatuses)[number];

/**
 * Water Quality Calculations table schema
 * Stores calculated water quality indices (HPI, MI) per station/location
 *
 * Indexes:
 * - upload_id_is_deleted_idx: For fetching calculations by upload
 * - station_id_idx: For searching by station
 * - state_city_idx: For geographic filtering
 * - created_at_idx: For sorting/pagination
 */
export const waterQualityCalculations = pgTable(
  'water_quality_calculations',
  {
    id: serial('id').primaryKey(),

    // Reference to uploaded file
    upload_id: integer('upload_id')
      .notNull()
      .references(() => uploads.id, { onDelete: 'cascade' }),

    // Station/Location identification from CSV
    sno: integer('sno'), // S.No from CSV
    station_id: varchar('station_id', { length: 255 }).notNull(),
    state: varchar('state', { length: 100 }),
    district: varchar('district', { length: 100 }),
    location: varchar('location', { length: 255 }),
    longitude: decimal('longitude', { precision: 11, scale: 8 }),
    latitude: decimal('latitude', { precision: 10, scale: 8 }),
    year: integer('year'),
    city: varchar('city', { length: 100 }), // Kept for backward compatibility

    // Calculated indices (only final values, not breakdown)
    hpi: decimal('hpi', { precision: 10, scale: 4 }),
    hpi_classification: varchar('hpi_classification', { length: 50 }).$type<HPIClassification>(),
    mi: decimal('mi', { precision: 10, scale: 4 }),
    mi_classification: varchar('mi_classification', { length: 50 }).$type<MIClassification>(),
    mi_class: varchar('mi_class', { length: 15 }).$type<MIClass>(),
    wqi: decimal('wqi', { precision: 10, scale: 4 }),
    wqi_classification: varchar('wqi_classification', { length: 50 }),

    // Metadata - stored as comma-separated strings (simpler than arrays for Drizzle)
    metals_analyzed: text('metals_analyzed'), // e.g., "As,Cu,Zn,Hg,Cd,Ni,Pb"
    params_analyzed: text('params_analyzed'), // e.g., "pH,TDS,TH,EC,Ca,Mg"

    // Audit fields
    created_by: integer('created_by').references(() => users.id),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_by: integer('updated_by'),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
    is_deleted: boolean('is_deleted').default(false).notNull(),
    deleted_by: integer('deleted_by'),
    deleted_at: timestamp('deleted_at'),
  },
  table => ({
    // Composite index for upload's calculations (most common query pattern)
    uploadIdIsDeletedIdx: index('wqc_upload_id_is_deleted_idx').on(table.upload_id, table.is_deleted),
    // For searching by station
    stationIdIdx: index('wqc_station_id_idx').on(table.station_id),
    // For geographic filtering
    stateCityIdx: index('wqc_state_city_idx').on(table.state, table.city),
    // For sorting/pagination
    createdAtIdx: index('wqc_created_at_idx').on(table.created_at),
  })
);

// Export types for TypeScript
export type WaterQualityCalculation = typeof waterQualityCalculations.$inferSelect;
export type NewWaterQualityCalculation = typeof waterQualityCalculations.$inferInsert;
