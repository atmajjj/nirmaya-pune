import {
  pgTable,
  serial,
  text,
  timestamp,
  boolean,
  integer,
  varchar,
  index,
  jsonb,
} from 'drizzle-orm/pg-core';

/**
 * Formula types supported by the system
 * - hpi: Heavy Metal Pollution Index
 * - mi: Metal Index
 * - wqi: Water Quality Index
 */
export const formulaTypes = ['hpi', 'mi', 'wqi'] as const;
export type FormulaType = (typeof formulaTypes)[number];

/**
 * Parameter definition for metal standards (HPI/MI)
 * Si = Standard permissible limit (ppb)
 * Ii = Ideal value (ppb)
 * MAC = Maximum Allowable Concentration (ppb)
 */
export interface MetalParameter {
  symbol: string;
  name: string;
  Si: number;
  Ii: number;
  MAC: number;
}

/**
 * Parameter definition for WQI standards
 * Sn = Standard permissible limit
 * Vo = Ideal value
 */
export interface WQIParameter {
  symbol: string;
  name: string;
  Sn: number;
  Vo: number;
  unit: string;
}

/**
 * Classification range for index interpretation
 */
export interface ClassificationRange {
  min?: number; // Optional for first range
  max?: number; // Optional for last range
  label: string;
  severity: number; // 1 = best, higher = worse
  description?: string;
}

/**
 * Complete classification configuration
 */
export interface ClassificationConfig {
  ranges: ClassificationRange[];
}

/**
 * Parameters structure stored in JSONB
 * Key is the parameter symbol (e.g., "As", "pH")
 */
export type FormulaParameters = Record<string, MetalParameter | WQIParameter>;

/**
 * Formulas table schema
 * Stores formula configurations for HPI, MI, and WQI calculations
 *
 * Indexes:
 * - type_is_deleted_idx: For filtering by formula type
 * - is_default_type_idx: For finding default formula by type
 * - name_is_deleted_idx: For searching by name
 */
export const formulas = pgTable(
  'formulas',
  {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    type: text('type').$type<FormulaType>().notNull(),
    description: text('description'),
    version: varchar('version', { length: 50 }), // e.g., "BIS 10500:2012", "WHO 2024"
    parameters: jsonb('parameters').$type<FormulaParameters>().notNull(),
    classification: jsonb('classification').$type<ClassificationConfig>().notNull(),
    is_default: boolean('is_default').default(false).notNull(),
    is_active: boolean('is_active').default(true).notNull(),

    // Audit fields
    created_by: integer('created_by').notNull(),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_by: integer('updated_by'),
    updated_at: timestamp('updated_at'),
    is_deleted: boolean('is_deleted').default(false).notNull(),
    deleted_by: integer('deleted_by'),
    deleted_at: timestamp('deleted_at'),
  },
  table => ({
    // Index for filtering by type
    typeIsDeletedIdx: index('formulas_type_is_deleted_idx').on(table.type, table.is_deleted),
    // Index for finding default formula
    isDefaultTypeIdx: index('formulas_is_default_type_idx').on(
      table.is_default,
      table.type,
      table.is_deleted
    ),
    // Index for name search
    nameIsDeletedIdx: index('formulas_name_is_deleted_idx').on(table.name, table.is_deleted),
    // Index for active formulas
    isActiveIdx: index('formulas_is_active_idx').on(table.is_active, table.is_deleted),
  })
);

// Export types for TypeScript
export type Formula = typeof formulas.$inferSelect;
export type NewFormula = typeof formulas.$inferInsert;
