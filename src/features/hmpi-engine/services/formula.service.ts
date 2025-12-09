/**
 * Formula Service
 * Provides formula configurations for Nirmaya calculations
 * Uses database standards when available, falls back to hardcoded constants
 */

import { logger } from '../../../utils/logger';
import { METAL_STANDARDS, classifyHPI } from '../shared/constants';
import { getActiveMetalStandards } from '../../standards/shared/queries';

/**
 * Extracted metal standards format for calculators
 */
export interface MetalStandardsConfig {
  [symbol: string]: {
    symbol: string;
    name: string;
    Si: number;
    Ii: number;
    MAC: number;
  };
}

/**
 * Classification function type
 */
export type ClassificationFn = (value: number) => string;

/**
 * Formula configuration for calculations
 */
export interface FormulaConfig {
  id: number;
  name: string;
  type: 'hpi' | 'mi';
  version: string | null;
  metalStandards?: MetalStandardsConfig;
  classify: ClassificationFn;
}

/**
 * Get formula configuration for HPI/MI calculations
 * Uses database standards if available, otherwise hardcoded constants
 * 
 * @param type - Formula type (hpi or mi)
 * @returns Formula configuration with standards and classification function
 */
export async function getMetalFormulaConfig(
  type: 'hpi' | 'mi'
): Promise<FormulaConfig> {
  try {
    // Try to get standards from database
    const dbStandards = await getActiveMetalStandards();
    
    if (dbStandards && dbStandards.length > 0) {
      logger.info(`Using database ${type.toUpperCase()} standards (${dbStandards.length} metals)`);
      
      // Convert database standards to format expected by calculators
      const metalStandards: MetalStandardsConfig = {};
      for (const std of dbStandards) {
        metalStandards[std.symbol] = {
          symbol: std.symbol,
          name: std.name,
          Si: parseFloat(std.si),
          Ii: parseFloat(std.ii),
          MAC: parseFloat(std.mac),
        };
      }

      // For MI, we need a wrapper since classifyMI returns object
      const classifyFn = type === 'hpi' 
        ? classifyHPI 
        : (value: number) => {
            // MI classification labels
            if (value < 0.3) return 'Very pure';
            if (value < 1) return 'Pure';
            if (value < 2) return 'Slightly affected';
            if (value < 4) return 'Moderately affected';
            if (value < 6) return 'Strongly affected';
            return 'Seriously affected';
          };
      
      return {
        id: 1, // Database formula
        name: `Database ${type.toUpperCase()} Standards`,
        type,
        version: 'BIS 10500:2012',
        metalStandards,
        classify: classifyFn,
      };
    }
  } catch (error) {
    logger.error(`Error fetching ${type} standards from database, falling back to hardcoded`, { error });
  }

  // Fallback to hardcoded constants
  logger.info(`Using hardcoded ${type.toUpperCase()} standards`);
  
  // For MI, we need a wrapper since classifyMI returns object
  const classifyFn = type === 'hpi' 
    ? classifyHPI 
    : (value: number) => {
        // MI classification labels matching seed data
        if (value < 0.3) return 'Very pure';
        if (value < 1) return 'Pure';
        if (value < 2) return 'Slightly affected';
        if (value < 4) return 'Moderately affected';
        if (value < 6) return 'Strongly affected';
        return 'Seriously affected';
      };
  
  return {
    id: 0, // Indicates hardcoded formula
    name: `Default ${type.toUpperCase()} (hardcoded)`,
    type,
    version: 'BIS 10500:2012',
    metalStandards: METAL_STANDARDS,
    classify: classifyFn,
  };
}
