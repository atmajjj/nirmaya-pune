import { db } from '../../database/drizzle';
import { formulas, FormulaParameters, ClassificationConfig } from './shared/schema';
import { logger } from '../../utils/logger';
import { eq, and } from 'drizzle-orm';

/**
 * Default HPI parameters based on BIS 10500:2012 / WHO Guidelines
 * All values in ppb (µg/L)
 */
export const DEFAULT_HPI_PARAMETERS: FormulaParameters = {
  As: { symbol: 'As', name: 'Arsenic', Si: 50, Ii: 10, MAC: 50 },
  Cu: { symbol: 'Cu', name: 'Copper', Si: 1500, Ii: 50, MAC: 1500 },
  Zn: { symbol: 'Zn', name: 'Zinc', Si: 15000, Ii: 5000, MAC: 15000 },
  Hg: { symbol: 'Hg', name: 'Mercury', Si: 2, Ii: 1, MAC: 1 },
  Cd: { symbol: 'Cd', name: 'Cadmium', Si: 5, Ii: 3, MAC: 3 },
  Ni: { symbol: 'Ni', name: 'Nickel', Si: 70, Ii: 20, MAC: 20 },
  Pb: { symbol: 'Pb', name: 'Lead', Si: 10, Ii: 0, MAC: 10 },
  Cr: { symbol: 'Cr', name: 'Chromium', Si: 50, Ii: 0, MAC: 50 },
  Fe: { symbol: 'Fe', name: 'Iron', Si: 300, Ii: 100, MAC: 300 },
  Mn: { symbol: 'Mn', name: 'Manganese', Si: 300, Ii: 100, MAC: 100 },
  Al: { symbol: 'Al', name: 'Aluminum', Si: 200, Ii: 0, MAC: 200 },
  Ba: { symbol: 'Ba', name: 'Barium', Si: 700, Ii: 0, MAC: 700 },
  Se: { symbol: 'Se', name: 'Selenium', Si: 10, Ii: 0, MAC: 10 },
  Ag: { symbol: 'Ag', name: 'Silver', Si: 100, Ii: 0, MAC: 100 },
  Mo: { symbol: 'Mo', name: 'Molybdenum', Si: 70, Ii: 0, MAC: 70 },
  Sb: { symbol: 'Sb', name: 'Antimony', Si: 20, Ii: 0, MAC: 20 },
  Co: { symbol: 'Co', name: 'Cobalt', Si: 50, Ii: 0, MAC: 50 },
  V: { symbol: 'V', name: 'Vanadium', Si: 100, Ii: 0, MAC: 100 },
  U: { symbol: 'U', name: 'Uranium', Si: 30, Ii: 0, MAC: 30 },
};

/**
 * HPI classification ranges
 */
export const DEFAULT_HPI_CLASSIFICATION: ClassificationConfig = {
  ranges: [
    { max: 25, label: 'Low pollution', severity: 1, description: 'Water suitable for drinking' },
    { min: 25, max: 50, label: 'Medium pollution', severity: 2, description: 'Water needs treatment' },
    { min: 50, max: 75, label: 'High pollution', severity: 3, description: 'Water unsuitable for direct consumption' },
    { min: 75, max: 100, label: 'Very high pollution', severity: 4, description: 'Serious health concerns' },
    { min: 100, label: 'Critical pollution', severity: 5, description: 'Unfit for any use' },
  ],
};

/**
 * MI classification ranges
 */
export const DEFAULT_MI_CLASSIFICATION: ClassificationConfig = {
  ranges: [
    { max: 0.3, label: 'Very pure', severity: 1, description: 'Excellent water quality' },
    { min: 0.3, max: 1, label: 'Pure', severity: 2, description: 'Good water quality' },
    { min: 1, max: 2, label: 'Slightly affected', severity: 3, description: 'Acceptable for most uses' },
    { min: 2, max: 4, label: 'Moderately affected', severity: 4, description: 'Requires treatment' },
    { min: 4, max: 6, label: 'Strongly affected', severity: 5, description: 'Unsuitable for drinking' },
    { min: 6, label: 'Seriously affected', severity: 6, description: 'Serious contamination' },
  ],
};

/**
 * Default WQI parameters based on BIS 10500:2012
 */
export const DEFAULT_WQI_PARAMETERS: FormulaParameters = {
  pH: { symbol: 'pH', name: 'pH', Sn: 8.5, Vo: 7, unit: '' },
  EC: { symbol: 'EC', name: 'Electrical Conductivity', Sn: 300, Vo: 0, unit: 'µS/cm' },
  TDS: { symbol: 'TDS', name: 'Total Dissolved Solids', Sn: 500, Vo: 0, unit: 'mg/L' },
  TH: { symbol: 'TH', name: 'Total Hardness', Sn: 300, Vo: 0, unit: 'mg/L' },
  Ca: { symbol: 'Ca', name: 'Calcium', Sn: 75, Vo: 0, unit: 'mg/L' },
  Mg: { symbol: 'Mg', name: 'Magnesium', Sn: 30, Vo: 0, unit: 'mg/L' },
  Fe: { symbol: 'Fe', name: 'Iron', Sn: 0.3, Vo: 0, unit: 'mg/L' },
  F: { symbol: 'F', name: 'Fluoride', Sn: 1, Vo: 0, unit: 'mg/L' },
  Turbidity: { symbol: 'Turbidity', name: 'Turbidity', Sn: 5, Vo: 0, unit: 'NTU' },
};

/**
 * WQI classification ranges
 */
export const DEFAULT_WQI_CLASSIFICATION: ClassificationConfig = {
  ranges: [
    { max: 25, label: 'Excellent', severity: 1, description: 'Water is suitable for all purposes' },
    { min: 25, max: 50, label: 'Good', severity: 2, description: 'Water is suitable for domestic use' },
    { min: 50, max: 75, label: 'Poor', severity: 3, description: 'Water needs treatment before use' },
    { min: 75, max: 100, label: 'Very Poor', severity: 4, description: 'Water is unsuitable for drinking' },
    { min: 100, label: 'Unfit for consumption', severity: 5, description: 'Water is hazardous for health' },
  ],
};

/**
 * Seed default formulas if they don't exist
 * @param adminUserId - The user ID to set as creator (typically admin)
 */
export async function seedDefaultFormulas(adminUserId: number): Promise<void> {
  logger.info('🔬 Checking for default formulas...');

  // Check if default HPI formula exists
  const existingHPI = await db
    .select()
    .from(formulas)
    .where(
      and(
        eq(formulas.type, 'hpi'),
        eq(formulas.is_default, true),
        eq(formulas.is_deleted, false)
      )
    )
    .limit(1);

  if (existingHPI.length === 0) {
    await db.insert(formulas).values({
      name: 'BIS 10500:2012 / WHO Standards',
      type: 'hpi',
      description: 'Default Heavy Metal Pollution Index formula based on Bureau of Indian Standards (BIS 10500:2012) and WHO drinking water guidelines. Includes 19 heavy metals with standard permissible limits and ideal values.',
      version: 'BIS 10500:2012',
      parameters: DEFAULT_HPI_PARAMETERS,
      classification: DEFAULT_HPI_CLASSIFICATION,
      is_default: true,
      is_active: true,
      created_by: adminUserId,
    });
    logger.info('✅ Created default HPI formula');
  } else {
    logger.info('ℹ️ Default HPI formula already exists');
  }

  // Check if default MI formula exists
  const existingMI = await db
    .select()
    .from(formulas)
    .where(
      and(
        eq(formulas.type, 'mi'),
        eq(formulas.is_default, true),
        eq(formulas.is_deleted, false)
      )
    )
    .limit(1);

  if (existingMI.length === 0) {
    await db.insert(formulas).values({
      name: 'Standard Metal Index',
      type: 'mi',
      description: 'Default Metal Index formula using Maximum Allowable Concentration (MAC) values from BIS and WHO guidelines. Used for assessing overall metal contamination in water.',
      version: 'BIS/WHO',
      parameters: DEFAULT_HPI_PARAMETERS, // MI uses same parameters as HPI (MAC values)
      classification: DEFAULT_MI_CLASSIFICATION,
      is_default: true,
      is_active: true,
      created_by: adminUserId,
    });
    logger.info('✅ Created default MI formula');
  } else {
    logger.info('ℹ️ Default MI formula already exists');
  }

  // Check if default WQI formula exists
  const existingWQI = await db
    .select()
    .from(formulas)
    .where(
      and(
        eq(formulas.type, 'wqi'),
        eq(formulas.is_default, true),
        eq(formulas.is_deleted, false)
      )
    )
    .limit(1);

  if (existingWQI.length === 0) {
    await db.insert(formulas).values({
      name: 'BIS Water Quality Index',
      type: 'wqi',
      description: 'Default Water Quality Index formula based on Bureau of Indian Standards (BIS 10500:2012). Calculates weighted arithmetic index using pH, EC, TDS, hardness, and other parameters.',
      version: 'BIS 10500:2012',
      parameters: DEFAULT_WQI_PARAMETERS,
      classification: DEFAULT_WQI_CLASSIFICATION,
      is_default: true,
      is_active: true,
      created_by: adminUserId,
    });
    logger.info('✅ Created default WQI formula');
  } else {
    logger.info('ℹ️ Default WQI formula already exists');
  }

  logger.info('🔬 Formula seeding complete');
}

/**
 * Run standalone seeding (for manual execution)
 */
export async function runFormulaSeed(): Promise<void> {
  try {
    // Use admin user ID 1 (or the first user in the system)
    await seedDefaultFormulas(1);
  } catch (error) {
    logger.error('❌ Error seeding formulas:', error);
    throw error;
  }
}
