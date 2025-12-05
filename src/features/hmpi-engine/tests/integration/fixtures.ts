/**
 * Shared test fixtures and helpers for HMPI Engine integration tests
 * 
 * Contains:
 * - Test CSV data matching the dataset folder structure
 * - Expected calculation results for validation
 * - Helper functions for creating test data
 */

// ============================================================================
// HPI Test Data (from dataset/hpi_input.csv and hpi_results.csv)
// ============================================================================

/**
 * HPI test data - transposed from original format to row-based format
 * Original has metals as rows, stations as columns
 * We need stations as rows with metal values as columns
 */
export const HPI_TEST_DATA = {
  // CSV content in row-based format (station per row)
  csv: `station_id,As,Cu,Zn,Hg,Cd,Ni,Pb
Station 1,0.048,2.54,43.89,2.83,0.06,0.095,0.215
Station 2,0.212,21.48,212.56,1.45,1.2,2.581,2.542
Station 3,0.097,9.58,89.58,1.45,0.49,1.054,1.785`,

  // Expected results from hpi_results.csv
  expectedResults: [
    { station_id: 'Station 1', hpi: 146.328, classification: 'Unsuitable - Critical pollution' },
    { station_id: 'Station 2', hpi: 52.734, classification: 'Poor - Medium pollution' },
    { station_id: 'Station 3', hpi: 60.390, classification: 'Poor - Medium pollution' },
  ],
};

// ============================================================================
// MI Test Data (from dataset/MI-input.csv and MI-output.csv)
// ============================================================================

/**
 * MI test data - transposed from original format
 * Values in PPB (parts per billion)
 */
export const MI_TEST_DATA = {
  csv: `station_id,As,Cd,Cu,Pb,Hg,Ni,Zn
Station 1,269.58,6.22,554.98,10.59,0.17,61.83,2587.05
Station 2,91.20,0.54,1512.56,21.48,0.58,5.89,898.12
Station 3,39.46,1.30,209.16,4.90,0.90,15.99,858.59`,

  // Expected results from MI-output.csv (Sum of Ci/MAC)
  expectedResults: [
    { station_id: 'Station 1', mi: 12.330, classification: 'Seriously Affected', mi_class: 'Class VI' },
    { station_id: 'Station 2', mi: 5.096, classification: 'Strongly Affected', mi_class: 'Class V' },
    { station_id: 'Station 3', mi: 3.602, classification: 'Moderately Affected', mi_class: 'Class IV' },
  ],
};

// ============================================================================
// WQI Test Data (from dataset/WQI-input.csv and WQI-output.csv)
// ============================================================================

/**
 * WQI test data - transposed from original format
 */
export const WQI_TEST_DATA = {
  csv: `station_id,pH,EC,TDS,TH,Ca,Mg,Fe,F,Turbidity
Site 1,7.9,100.33,67.22,40.67,55.61,6.48,0.05,0.02,1.3
Site 2,4.6,310,473.7,239.33,45.05,16.5,0.38,0.06,2.48
Site 3,6.1,122,266.66,122.87,28.17,21.83,0.11,0.5,4.15`,

  // Expected results from WQI-output.csv
  expectedResults: [
    { station_id: 'Site 1', wqi: 15.23, classification: 'Excellent' },
    { station_id: 'Site 2', wqi: 97.82, classification: 'Very Poor' },
    { station_id: 'Site 3', wqi: 42.32, classification: 'Good' },
  ],
};

// ============================================================================
// Combined Test Data (for full feature testing)
// ============================================================================

/**
 * Combined dataset with all parameters for testing all three indices
 */
export const COMBINED_TEST_DATA = {
  csv: `station_id,latitude,longitude,state,city,As,Cu,Zn,Hg,Cd,Ni,Pb,pH,EC,TDS,TH,Ca,Mg,Fe,F,Turbidity
Station A,28.6139,77.2090,Delhi,New Delhi,50,100,200,1.5,3,40,8,7.5,250,400,200,60,25,0.2,0.8,3
Station B,19.0760,72.8777,Maharashtra,Mumbai,25,80,150,0.8,2,30,5,7.2,200,350,180,50,20,0.15,0.5,2
Station C,12.9716,77.5946,Karnataka,Bangalore,75,150,300,2,4,50,12,6.8,300,500,250,70,30,0.3,1.0,4`,
};

// ============================================================================
// Invalid/Edge Case Test Data
// ============================================================================

export const INVALID_TEST_DATA = {
  // CSV with no recognized columns
  noRecognizedColumns: `name,value,category
Item1,100,A
Item2,200,B`,

  // CSV with empty data
  emptyData: `station_id,As,Cu,Pb`,

  // CSV with missing values
  missingValues: `station_id,As,Cu,Pb
Station 1,10,,5
Station 2,,,
Station 3,15,60,8`,

  // CSV with invalid numeric values
  invalidNumeric: `station_id,As,Cu,Pb
Station 1,abc,50,5
Station 2,N/A,invalid,text`,

  // CSV with only location data (no parameters)
  onlyLocation: `station_id,latitude,longitude,state
Station 1,28.5,77.2,Delhi
Station 2,19.0,72.8,Maharashtra`,

  // CSV with fewer than minimum metals
  fewMetals: `station_id,As,Cu
Station 1,10,50`,

  // CSV with fewer than minimum WQI params
  fewWqiParams: `station_id,pH,TDS
Station 1,7.5,400`,
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create a Buffer from CSV string for file upload tests
 */
export function createCSVBuffer(csvContent: string): Buffer {
  return Buffer.from(csvContent, 'utf-8');
}

/**
 * Compare calculated value with expected value within tolerance
 * Default tolerance is 1% for floating point comparison
 */
export function isWithinTolerance(
  calculated: number,
  expected: number,
  tolerancePercent: number = 1
): boolean {
  const tolerance = expected * (tolerancePercent / 100);
  return Math.abs(calculated - expected) <= Math.abs(tolerance);
}

/**
 * Round number to specified decimal places
 */
export function roundTo(value: number, decimals: number): number {
  return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

// ============================================================================
// API Paths (updated to remove /v1)
// ============================================================================

export const API_PATHS = {
  preview: '/api/hmpi-engine/preview',
  calculate: '/api/hmpi-engine/calculate',
  calculations: '/api/hmpi-engine/calculations',
  calculation: (id: number) => `/api/hmpi-engine/calculations/${id}`,
  download: (uploadId: number) => `/api/hmpi-engine/uploads/${uploadId}/download`,
  stats: '/api/hmpi-engine/stats',
};
