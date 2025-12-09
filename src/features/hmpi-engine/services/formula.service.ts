/**
 * Formula Service
 * Provides methods to fetch formulas from database for Nirmaya calculations
 */

import { findDefaultFormula, findFormulaById } from '../../formula-editor/shared/queries';
import { FormulaType, MetalParameter, WQIParameter } from '../../formula-editor/shared/schema';
import { logger } from '../../../utils/logger';
import { METAL_STANDARDS, WQI_STANDARDS, classifyHPI, classifyWQI } from '../shared/constants';

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
 * Extracted WQI standards format for calculators
 */
export interface WQIStandardsConfig {
  [symbol: string]: {
    symbol: string;
    name: string;
    Sn: number;
    Vo: number;
    unit: string;
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
  type: FormulaType;
  version: string | null;
  metalStandards?: MetalStandardsConfig;
  wqiStandards?: WQIStandardsConfig;
  classify: ClassificationFn;
}

/**
 * Get formula configuration for HPI/MI calculations
 * Falls back to hardcoded constants if database formula not found
 * 
 * @param formulaId - Optional formula ID to use
 * @param type - Formula type (hpi or mi)
 * @returns Formula configuration with standards and classification function
 */
export async function getMetalFormulaConfig(
  type: 'hpi' | 'mi',
  formulaId?: number
): Promise<FormulaConfig> {
  try {
    // Try to get formula from database
    let formula;
    
    if (formulaId) {
      formula = await findFormulaById(formulaId);
      if (!formula) {
        logger.warn(`Formula ${formulaId} not found, using default ${type.toUpperCase()} formula`);
      }
    }
    
    if (!formula) {
      formula = await findDefaultFormula(type);
    }

    if (formula) {
      // Extract metal standards from formula parameters
      const metalStandards: MetalStandardsConfig = {};
      
      for (const [symbol, param] of Object.entries(formula.parameters)) {
        const metalParam = param as MetalParameter;
        metalStandards[symbol] = {
          symbol: metalParam.symbol,
          name: metalParam.name,
          Si: metalParam.Si,
          Ii: metalParam.Ii,
          MAC: metalParam.MAC,
        };
      }

      // Create classification function from formula ranges
      const classifyFn = createClassificationFunction(formula.classification.ranges);

      return {
        id: formula.id,
        name: formula.name,
        type: formula.type,
        version: formula.version,
        metalStandards,
        classify: classifyFn,
      };
    }
  } catch (error) {
    logger.error(`Error fetching ${type} formula from database`, { error });
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

/**
 * Get formula configuration for WQI calculations
 * Falls back to hardcoded constants if database formula not found
 * 
 * @param formulaId - Optional formula ID to use
 * @returns Formula configuration with WQI standards and classification function
 */
export async function getWQIFormulaConfig(formulaId?: number): Promise<FormulaConfig> {
  try {
    // Try to get formula from database
    let formula;
    
    if (formulaId) {
      formula = await findFormulaById(formulaId);
      if (!formula) {
        logger.warn(`Formula ${formulaId} not found, using default WQI formula`);
      }
    }
    
    if (!formula) {
      formula = await findDefaultFormula('wqi');
    }

    if (formula) {
      // Extract WQI standards from formula parameters
      const wqiStandards: WQIStandardsConfig = {};
      
      for (const [symbol, param] of Object.entries(formula.parameters)) {
        const wqiParam = param as WQIParameter;
        wqiStandards[symbol] = {
          symbol: wqiParam.symbol,
          name: wqiParam.name,
          Sn: wqiParam.Sn,
          Vo: wqiParam.Vo,
          unit: wqiParam.unit,
        };
      }

      // Create classification function from formula ranges
      const classifyFn = createClassificationFunction(formula.classification.ranges);

      return {
        id: formula.id,
        name: formula.name,
        type: formula.type,
        version: formula.version,
        wqiStandards,
        classify: classifyFn,
      };
    }
  } catch (error) {
    logger.error('Error fetching WQI formula from database', { error });
  }

  // Fallback to hardcoded constants
  logger.info('Using hardcoded WQI standards');
  return {
    id: 0,
    name: 'Default WQI (hardcoded)',
    type: 'wqi',
    version: 'BIS 10500:2012',
    wqiStandards: WQI_STANDARDS,
    classify: classifyWQI,
  };
}

/**
 * Create a classification function from formula ranges
 */
function createClassificationFunction(
  ranges: Array<{ min?: number; max?: number; label: string }>
): ClassificationFn {
  // Sort ranges by min value (ascending)
  const sortedRanges = [...ranges].sort((a, b) => {
    const aMin = a.min ?? -Infinity;
    const bMin = b.min ?? -Infinity;
    return aMin - bMin;
  });

  return (value: number): string => {
    for (const range of sortedRanges) {
      const min = range.min ?? -Infinity;
      const max = range.max ?? Infinity;

      if (value >= min && value <= max) {
        return range.label;
      }
    }

    // Return last range label if value exceeds all ranges
    return sortedRanges[sortedRanges.length - 1]?.label || 'Unknown';
  };
}

/**
 * Get all available formula configurations for a type
 * Useful for listing available formulas in UI
 */
export async function getAvailableFormulas(type?: FormulaType): Promise<Array<{
  id: number;
  name: string;
  type: FormulaType;
  version: string | null;
  is_default: boolean;
}>> {
  // Import here to avoid circular dependency
  const { getFormulaSummaries } = await import('../../formula-editor/shared/queries');
  return getFormulaSummaries(type);
}
