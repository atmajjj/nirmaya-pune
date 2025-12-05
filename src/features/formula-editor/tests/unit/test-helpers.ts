/**
 * Test helpers for Formula Editor tests
 */

/**
 * Classification range interface for testing
 */
export interface TestClassificationRange {
  min?: number;
  max?: number;
  label: string;
  severity: number;
  description?: string;
}

/**
 * Create a classification function from formula ranges
 * This is a copy of the logic from formula.service.ts for unit testing
 */
export function createClassificationFunction(
  ranges: TestClassificationRange[]
): (value: number) => string {
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
 * Sample HPI formula parameters for testing
 */
export const sampleHPIParameters = {
  As: { symbol: 'As', name: 'Arsenic', Si: 50, Ii: 10, MAC: 50 },
  Cu: { symbol: 'Cu', name: 'Copper', Si: 1500, Ii: 50, MAC: 1500 },
  Zn: { symbol: 'Zn', name: 'Zinc', Si: 15000, Ii: 5000, MAC: 15000 },
  Pb: { symbol: 'Pb', name: 'Lead', Si: 10, Ii: 0, MAC: 10 },
  Fe: { symbol: 'Fe', name: 'Iron', Si: 300, Ii: 100, MAC: 300 },
};

/**
 * Sample WQI formula parameters for testing
 */
export const sampleWQIParameters = {
  pH: { symbol: 'pH', name: 'pH', Sn: 8.5, Vo: 7, unit: '' },
  TDS: { symbol: 'TDS', name: 'Total Dissolved Solids', Sn: 500, Vo: 0, unit: 'mg/L' },
  TH: { symbol: 'TH', name: 'Total Hardness', Sn: 300, Vo: 0, unit: 'mg/L' },
};

/**
 * Sample HPI classification ranges for testing
 */
export const sampleHPIClassification = {
  ranges: [
    { max: 25, label: 'Low pollution', severity: 1 },
    { min: 25, max: 50, label: 'Medium pollution', severity: 2 },
    { min: 50, max: 75, label: 'High pollution', severity: 3 },
    { min: 75, max: 100, label: 'Very high pollution', severity: 4 },
    { min: 100, label: 'Critical pollution', severity: 5 },
  ],
};

/**
 * Sample MI classification ranges for testing
 */
export const sampleMIClassification = {
  ranges: [
    { max: 0.3, label: 'Very pure', severity: 1 },
    { min: 0.3, max: 1, label: 'Pure', severity: 2 },
    { min: 1, max: 2, label: 'Slightly affected', severity: 3 },
    { min: 2, max: 4, label: 'Moderately affected', severity: 4 },
    { min: 4, max: 6, label: 'Strongly affected', severity: 5 },
    { min: 6, label: 'Seriously affected', severity: 6 },
  ],
};

/**
 * Sample WQI classification ranges for testing
 */
export const sampleWQIClassification = {
  ranges: [
    { max: 25, label: 'Excellent', severity: 1 },
    { min: 25, max: 50, label: 'Good', severity: 2 },
    { min: 50, max: 75, label: 'Poor', severity: 3 },
    { min: 75, max: 100, label: 'Very Poor', severity: 4 },
    { min: 100, label: 'Unfit for consumption', severity: 5 },
  ],
};
