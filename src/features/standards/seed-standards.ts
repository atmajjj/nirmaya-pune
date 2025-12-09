import { db } from '../../database/drizzle';
import { metalStandards } from './shared/schema';
import { logger } from '../../utils/logger';

/**
 * Seed default metal standards based on BIS 10500:2012 and WHO Guidelines
 */
export async function seedMetalStandards(userId: number) {
  logger.info('Seeding metal standards...');

  const defaultMetalStandards = [
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

  const records = defaultMetalStandards.map(std => ({
    ...std,
    created_by: userId,
    is_deleted: false,
  }));

  await db.insert(metalStandards).values(records);
  logger.info(`✅ Seeded ${records.length} metal standards`);
}
