/**
 * Dataset Type Detector
 * Analyzes uploaded file columns to determine which indices can be calculated
 */

import { METAL_STANDARDS, WQI_STANDARDS, WQI_COLUMN_ALIASES, METAL_COLUMN_ALIASES } from '../../hmpi-engine/shared/constants';

export interface DatasetTypeDetection {
  canCalculateWQI: boolean;
  canCalculateHPI: boolean;
  canCalculateMI: boolean;
  wqiParametersFound: string[];
  metalParametersFound: string[];
  missingWQIParameters: string[];
  missingMetalParameters: string[];
}

/**
 * Normalize column name for comparison
 */
function normalizeColumnName(columnName: string): string {
  return columnName.toLowerCase().trim().replace(/[_\s-]+/g, '');
}

/**
 * Check if a column matches a parameter (considering aliases)
 */
function matchesParameter(columnName: string, parameterSymbol: string, aliases: Record<string, string[]>): boolean {
  const normalized = normalizeColumnName(columnName);
  const paramNormalized = parameterSymbol.toLowerCase();
  
  // Direct match
  if (normalized === paramNormalized) {
    return true;
  }
  
  // Check aliases
  const paramAliases = aliases[parameterSymbol] || [];
  return paramAliases.some(alias => normalizeColumnName(alias) === normalized);
}

/**
 * Detect which indices can be calculated based on dataset columns
 * 
 * WQI Requirements: At least 3-4 key parameters (pH, TDS, TH, etc.)
 * HPI/MI Requirements: At least 2-3 heavy metals
 */
export function detectDatasetType(columns: string[]): DatasetTypeDetection {
  const wqiParametersFound: string[] = [];
  const metalParametersFound: string[] = [];
  
  // Check for WQI parameters
  for (const param of Object.keys(WQI_STANDARDS)) {
    const found = columns.some(col => matchesParameter(col, param, WQI_COLUMN_ALIASES));
    if (found) {
      wqiParametersFound.push(param);
    }
  }
  
  // Check for metal parameters
  for (const metal of Object.keys(METAL_STANDARDS)) {
    const found = columns.some(col => matchesParameter(col, metal, METAL_COLUMN_ALIASES));
    if (found) {
      metalParametersFound.push(metal);
    }
  }
  
  // Determine if calculations are possible
  // WQI: Need at least 3 parameters from the standard set
  const canCalculateWQI = wqiParametersFound.length >= 3;
  
  // HPI/MI: Need at least 2 metals for meaningful calculation
  const canCalculateHPI = metalParametersFound.length >= 2;
  const canCalculateMI = metalParametersFound.length >= 2;
  
  // Determine missing parameters (for informational purposes)
  const missingWQIParameters = Object.keys(WQI_STANDARDS).filter(
    param => !wqiParametersFound.includes(param)
  );
  
  const missingMetalParameters = Object.keys(METAL_STANDARDS).filter(
    metal => !metalParametersFound.includes(metal)
  );
  
  return {
    canCalculateWQI,
    canCalculateHPI,
    canCalculateMI,
    wqiParametersFound,
    metalParametersFound,
    missingWQIParameters,
    missingMetalParameters,
  };
}

/**
 * Get a human-readable description of what can be calculated
 */
export function getCalculationDescription(detection: DatasetTypeDetection): string {
  const canCalculate: string[] = [];
  
  if (detection.canCalculateWQI) {
    canCalculate.push(`WQI (${detection.wqiParametersFound.length} parameters)`);
  }
  
  if (detection.canCalculateHPI) {
    canCalculate.push(`HPI (${detection.metalParametersFound.length} metals)`);
  }
  
  if (detection.canCalculateMI) {
    canCalculate.push(`MI (${detection.metalParametersFound.length} metals)`);
  }
  
  if (canCalculate.length === 0) {
    return 'No indices can be calculated (insufficient parameters)';
  }
  
  return `Can calculate: ${canCalculate.join(', ')}`;
}
