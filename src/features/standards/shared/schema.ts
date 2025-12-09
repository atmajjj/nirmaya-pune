import {
  pgTable,
  serial,
  timestamp,
  boolean,
  integer,
  varchar,
  index,
  decimal,
} from 'drizzle-orm/pg-core';

/**
 * Standard types supported by the system
 */
export const standardTypes = ['metal'] as const;
export type StandardType = (typeof standardTypes)[number];

/**
 * Metal Standards Table
 * Stores configurable standards for heavy metal parameters (HPI/MI calculations)
 * Si = Standard permissible limit (ppb)
 * Ii = Ideal value (ppb)
 * MAC = Maximum Allowable Concentration (ppb)
 */
export const metalStandards = pgTable(
  'metal_standards',
  {
    id: serial('id').primaryKey(),
    symbol: varchar('symbol', { length: 10 }).notNull().unique(),
    name: varchar('name', { length: 100 }).notNull(),
    si: decimal('si', { precision: 10, scale: 3 }).notNull(), // Standard permissible limit (ppb)
    ii: decimal('ii', { precision: 10, scale: 3 }).notNull(), // Ideal value (ppb)
    mac: decimal('mac', { precision: 10, scale: 3 }).notNull(), // Maximum Allowable Concentration (ppb)

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
    symbolIdx: index('metal_standards_symbol_idx').on(table.symbol, table.is_deleted),
  })
);

// Export types for TypeScript
export type MetalStandard = typeof metalStandards.$inferSelect;
export type NewMetalStandard = typeof metalStandards.$inferInsert;
