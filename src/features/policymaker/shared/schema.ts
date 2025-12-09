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
import { waterQualityCalculations } from '../../hmpi-engine/shared/schema';

/**
 * Alert severity levels
 */
export const alertSeverities = ['low', 'medium', 'high', 'critical'] as const;
export type AlertSeverity = (typeof alertSeverities)[number];

/**
 * Alert types based on index
 */
export const alertTypes = ['hpi', 'mi', 'wqi', 'combined'] as const;
export type AlertType = (typeof alertTypes)[number];

/**
 * Alert status
 */
export const alertStatuses = ['active', 'acknowledged', 'resolved', 'dismissed'] as const;
export type AlertStatus = (typeof alertStatuses)[number];

/**
 * Risk levels for location classification
 */
export const riskLevels = ['safe', 'moderate', 'unsafe'] as const;
export type RiskLevel = (typeof riskLevels)[number];

/**
 * Policymaker alerts table
 * Stores alerts for high-risk locations based on HPI/MI/WQI values
 */
export const policymakerAlerts = pgTable(
  'policymaker_alerts',
  {
    id: serial('id').primaryKey(),

    // Reference to the calculation that triggered the alert
    calculation_id: integer('calculation_id')
      .notNull()
      .references(() => waterQualityCalculations.id, { onDelete: 'cascade' }),

    // Alert metadata
    alert_type: varchar('alert_type', { length: 20 }).$type<AlertType>().notNull(),
    severity: varchar('severity', { length: 20 }).$type<AlertSeverity>().notNull(),
    status: varchar('status', { length: 20 }).$type<AlertStatus>().default('active').notNull(),

    // Location info (denormalized for quick access)
    station_id: varchar('station_id', { length: 255 }).notNull(),
    state: varchar('state', { length: 100 }),
    district: varchar('district', { length: 100 }),
    location: varchar('location', { length: 255 }),
    latitude: decimal('latitude', { precision: 10, scale: 8 }),
    longitude: decimal('longitude', { precision: 11, scale: 8 }),

    // Index values at alert time
    hpi_value: decimal('hpi_value', { precision: 10, scale: 4 }),
    hpi_classification: varchar('hpi_classification', { length: 50 }),
    mi_value: decimal('mi_value', { precision: 10, scale: 4 }),
    mi_classification: varchar('mi_classification', { length: 50 }),
    wqi_value: decimal('wqi_value', { precision: 10, scale: 4 }),
    wqi_classification: varchar('wqi_classification', { length: 50 }),

    // Risk level (computed based on combined indices)
    risk_level: varchar('risk_level', { length: 20 }).$type<RiskLevel>().notNull(),

    // Alert details
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    recommendations: text('recommendations'),

    // Acknowledgment tracking
    acknowledged_by: integer('acknowledged_by').references(() => users.id),
    acknowledged_at: timestamp('acknowledged_at'),
    resolution_notes: text('resolution_notes'),
    resolved_at: timestamp('resolved_at'),

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
    // For fetching alerts by status
    statusIdx: index('pa_status_idx').on(table.status, table.is_deleted),
    // For fetching alerts by severity
    severityIdx: index('pa_severity_idx').on(table.severity, table.is_deleted),
    // For geographic filtering
    stateDistrictIdx: index('pa_state_district_idx').on(table.state, table.district),
    // For risk level filtering
    riskLevelIdx: index('pa_risk_level_idx').on(table.risk_level, table.is_deleted),
    // For calculation reference
    calculationIdx: index('pa_calculation_idx').on(table.calculation_id),
    // For sorting by date
    createdAtIdx: index('pa_created_at_idx').on(table.created_at),
  })
);

// Export types for TypeScript
export type PolicymakerAlert = typeof policymakerAlerts.$inferSelect;
export type NewPolicymakerAlert = typeof policymakerAlerts.$inferInsert;
