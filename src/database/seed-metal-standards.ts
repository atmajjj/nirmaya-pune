/**
 * Seed Metal Standards
 * Populates the metal_standards table with default values used in HPI/MI calculations
 * Based on BIS 10500:2012 and WHO Guidelines
 */

import { db } from './drizzle';
import { metalStandards } from '../features/standards/shared/schema';
import { logger } from '../utils/logger';

interface MetalStandardData {
  symbol: string;
  name: string;
  si: string; // Standard permissible limit (ppb)
  ii: string; // Ideal value (ppb)
  mac: string; // Maximum Allowable Concentration (ppb)
}

/**
 * Default metal standards based on BIS 10500:2012 and WHO Guidelines
 * All values in ppb (µg/L)
 */
const defaultMetalStandards: MetalStandardData[] = [
  { symbol: 'As', name: 'Arsenic', si: '50', ii: '10', mac: '50' },
  { symbol: 'Cu', name: 'Copper', si: '1500', ii: '50', mac: '1500' },
  { symbol: 'Zn', name: 'Zinc', si: '15000', ii: '5000', mac: '15000' },
  { symbol: 'Hg', name: 'Mercury', si: '2', ii: '1', mac: '1' },
  { symbol: 'Cd', name: 'Cadmium', si: '10', ii: '0', mac: '3' },
  { symbol: 'Ni', name: 'Nickel', si: '70', ii: '20', mac: '20' },
  { symbol: 'Pb', name: 'Lead', si: '50', ii: '0', mac: '10' },
  { symbol: 'Cr', name: 'Chromium', si: '50', ii: '0', mac: '50' },
  { symbol: 'Fe', name: 'Iron', si: '1000', ii: '300', mac: '300' },
  { symbol: 'Mn', name: 'Manganese', si: '300', ii: '100', mac: '100' },
  { symbol: 'Al', name: 'Aluminum', si: '200', ii: '0', mac: '200' },
  { symbol: 'Ba', name: 'Barium', si: '700', ii: '0', mac: '700' },
  { symbol: 'Se', name: 'Selenium', si: '10', ii: '0', mac: '10' },
  { symbol: 'Ag', name: 'Silver', si: '100', ii: '0', mac: '100' },
  { symbol: 'Mo', name: 'Molybdenum', si: '70', ii: '0', mac: '70' },
  { symbol: 'Sb', name: 'Antimony', si: '20', ii: '0', mac: '20' },
  { symbol: 'Co', name: 'Cobalt', si: '50', ii: '0', mac: '50' },
  { symbol: 'V', name: 'Vanadium', si: '100', ii: '0', mac: '100' },
  { symbol: 'U', name: 'Uranium', si: '30', ii: '0', mac: '30' },
];

/**
 * Seed metal standards into database
 */
export async function seedMetalStandards(createdBy: number = 1) {
  try {
    logger.info('Starting metal standards seeding...');

    // Check if standards already exist
    const existingStandards = await db
      .select()
      .from(metalStandards)
      .limit(1);

    if (existingStandards.length > 0) {
      logger.info('Metal standards already exist. Skipping seeding.');
      return;
    }

    // Insert all standards
    const inserted = await db
      .insert(metalStandards)
      .values(
        defaultMetalStandards.map(standard => ({
          symbol: standard.symbol,
          name: standard.name,
          si: standard.si,
          ii: standard.ii,
          mac: standard.mac,
          created_by: createdBy,
          is_deleted: false,
        }))
      )
      .returning();

    logger.info(`✅ Successfully seeded ${inserted.length} metal standards`);
    return inserted;
  } catch (error) {
    logger.error('Failed to seed metal standards:', error);
    throw error;
  }
}

// Run seeding if executed directly
if (require.main === module) {
  seedMetalStandards()
    .then(() => {
      logger.info('Metal standards seeding completed');
      process.exit(0);
    })
    .catch(error => {
      logger.error('Metal standards seeding failed:', error);
      process.exit(1);
    });
}
