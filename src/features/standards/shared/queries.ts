import { eq, and } from 'drizzle-orm';
import { db } from '../../../database/drizzle';
import { metalStandards, MetalStandard } from './schema';

/**
 * Get all active metal standards
 */
export async function getActiveMetalStandards(): Promise<MetalStandard[]> {
  return db
    .select()
    .from(metalStandards)
    .where(eq(metalStandards.is_deleted, false))
    .orderBy(metalStandards.symbol);
}

/**
 * Get metal standard by symbol
 */
export async function getMetalStandardBySymbol(symbol: string): Promise<MetalStandard | undefined> {
  const [standard] = await db
    .select()
    .from(metalStandards)
    .where(and(eq(metalStandards.symbol, symbol), eq(metalStandards.is_deleted, false)))
    .limit(1);
  return standard;
}

/**
 * Get metal standard by ID
 */
export async function getMetalStandardById(id: number): Promise<MetalStandard | undefined> {
  const [standard] = await db
    .select()
    .from(metalStandards)
    .where(and(eq(metalStandards.id, id), eq(metalStandards.is_deleted, false)))
    .limit(1);
  return standard;
}
