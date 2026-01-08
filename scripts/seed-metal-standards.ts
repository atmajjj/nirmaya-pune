/**
 * Seed Metal Standards
 * Populates the metal_standards table with initial values from METAL_STANDARDS constant
 */

import { db } from '../src/database/drizzle';
import { metalStandards } from '../src/features/standards/shared/schema';
import { METAL_STANDARDS } from '../src/features/hmpi-engine/shared/constants';
import { logger } from '../src/utils/logger';

const ADMIN_USER_ID = 1; // System admin ID for seeding

async function seedMetalStandards() {
  try {
    logger.info('🌱 Starting metal standards seeding...');

    // Prepare metal standards data from constants
    const metalStandardsData = Object.values(METAL_STANDARDS).map(metal => ({
      symbol: metal.symbol,
      name: metal.name,
      si: metal.Si.toString(),
      ii: metal.Ii.toString(),
      mac: metal.MAC.toString(),
      created_by: ADMIN_USER_ID,
      is_deleted: false,
    }));

    logger.info(`📊 Prepared ${metalStandardsData.length} metal standards for insertion`);

    // Insert all metal standards
    // Using ON CONFLICT to update if already exists (upsert)
    for (const standard of metalStandardsData) {
      await db
        .insert(metalStandards)
        .values(standard)
        .onConflictDoUpdate({
          target: metalStandards.symbol,
          set: {
            name: standard.name,
            si: standard.si,
            ii: standard.ii,
            mac: standard.mac,
            updated_by: ADMIN_USER_ID,
            updated_at: new Date(),
          },
        });
      
      logger.info(`✅ Seeded/Updated: ${standard.symbol} - ${standard.name}`);
    }

    logger.info('✅ Metal standards seeding completed successfully!');
    
    // Show summary
    const count = await db.$count(metalStandards);
    logger.info(`📈 Total metal standards in database: ${count}`);
    
    process.exit(0);
  } catch (error) {
    logger.error('❌ Error seeding metal standards:', error);
    process.exit(1);
  }
}

// Run the seeding
seedMetalStandards();
