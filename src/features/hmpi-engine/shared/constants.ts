import {
  HPIClassification,
  MIClassification,
  MIClass,
} from './schema';

// ============================================================================
// Heavy Metal Standards (BIS 10500:2012 / WHO)
// All values in ppb (µg/L)
// ============================================================================

/**
 * Metal definition for HPI calculation
 * Si = Standard permissible limit
 * Ii = Ideal value
 */
export interface MetalStandard {
  symbol: string;
  name: string;
  Si: number; // Standard permissible limit (ppb)
  Ii: number; // Ideal value (ppb)
  MAC: number; // Maximum Allowable Concentration for MI (ppb)
}

/**
 * Heavy metal standards based on BIS 10500:2012 and WHO Guidelines
 */
export const METAL_STANDARDS: Record<string, MetalStandard> = {
  As: { symbol: 'As', name: 'Arsenic', Si: 50, Ii: 10, MAC: 50 },
  Cu: { symbol: 'Cu', name: 'Copper', Si: 1500, Ii: 50, MAC: 1500 },
  Zn: { symbol: 'Zn', name: 'Zinc', Si: 15000, Ii: 5000, MAC: 15000 },
  Hg: { symbol: 'Hg', name: 'Mercury', Si: 2, Ii: 1, MAC: 1 },
  Cd: { symbol: 'Cd', name: 'Cadmium', Si: 10, Ii: 0, MAC: 3 },
  Ni: { symbol: 'Ni', name: 'Nickel', Si: 70, Ii: 20, MAC: 20 },
  Pb: { symbol: 'Pb', name: 'Lead', Si: 50, Ii: 0, MAC: 10 },
  Cr: { symbol: 'Cr', name: 'Chromium', Si: 50, Ii: 0, MAC: 50 },
  Fe: { symbol: 'Fe', name: 'Iron', Si: 1000, Ii: 300, MAC: 300 },
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
 * Column name aliases for metal symbols (case-insensitive matching)
 */
export const METAL_COLUMN_ALIASES: Record<string, string[]> = {
  As: ['as', 'arsenic'],
  Cu: ['cu', 'copper'],
  Zn: ['zn', 'zinc'],
  Hg: ['hg', 'mercury'],
  Cd: ['cd', 'cadmium'],
  Ni: ['ni', 'nickel'],
  Pb: ['pb', 'lead'],
  Cr: ['cr', 'chromium'],
  Fe: ['fe', 'iron'],
  Mn: ['mn', 'manganese'],
  Al: ['al', 'aluminum', 'aluminium'],
  Ba: ['ba', 'barium'],
  Se: ['se', 'selenium'],
  Ag: ['ag', 'silver'],
  Mo: ['mo', 'molybdenum'],
  Sb: ['sb', 'antimony'],
  Co: ['co', 'cobalt'],
  V: ['v', 'vanadium'],
  U: ['u', 'uranium'],
};

// ============================================================================
// Location Column Aliases
// ============================================================================

/**
 * Column name aliases for location fields (case-insensitive matching)
 */
export const LOCATION_COLUMN_ALIASES = {
  sno: ['s.no', 'sno', 's no', 'serial', 'serial_no', 'sr_no', 'srno'],
  station_id: ['station_id', 'station', 'site', 'sample_id', 'id', 'name', 'station name', 'site_id', 'sample'],
  state: ['state', 'province', 'region'],
  district: ['district', 'dist'],
  location: ['location', 'loc', 'place', 'area', 'locality'],
  longitude: ['longitude', 'lng', 'lon', 'long'],
  latitude: ['latitude', 'lat'],
  year: ['year', 'sampling_year', 'sample_year', 'date'],
  city: ['city', 'town', 'village'], // Kept separate from district
};

// ============================================================================
// Classification Functions
// ============================================================================

/**
 * Classify HPI value
 * HPI < 25: Excellent - Low pollution
 * HPI 25-50: Good - Low to medium pollution
 * HPI 50-75: Poor - Medium pollution
 * HPI 75-100: Very Poor - High pollution
 * HPI > 100: Unsuitable - Critical pollution
 */
export function classifyHPI(hpi: number): HPIClassification {
  if (hpi < 25) return 'Excellent - Low pollution';
  if (hpi < 50) return 'Good - Low to medium pollution';
  if (hpi < 75) return 'Poor - Medium pollution';
  if (hpi < 100) return 'Very Poor - High pollution';
  return 'Unsuitable - Critical pollution';
}

/**
 * Classify MI value and return classification with class number
 * MI < 0.3: Class I - Very Pure
 * MI 0.3-1: Class II - Pure
 * MI 1-2: Class III - Slightly Affected
 * MI 2-4: Class IV - Moderately Affected
 * MI 4-6: Class V - Strongly Affected
 * MI >= 6: Class VI - Seriously Affected
 */
export function classifyMI(mi: number): { classification: MIClassification; miClass: MIClass } {
  if (mi < 0.3) return { classification: 'Very Pure', miClass: 'Class I' };
  if (mi < 1) return { classification: 'Pure', miClass: 'Class II' };
  if (mi < 2) return { classification: 'Slightly Affected', miClass: 'Class III' };
  if (mi < 4) return { classification: 'Moderately Affected', miClass: 'Class IV' };
  if (mi < 6) return { classification: 'Strongly Affected', miClass: 'Class V' };
  return { classification: 'Seriously Affected', miClass: 'Class VI' };
}

// ============================================================================
// Unit Conversion
// ============================================================================

/**
 * Unit conversion factors to ppb
 * 1 mg/L = 1000 ppb (µg/L)
 * 1 ppm = 1000 ppb
 */
export const UNIT_CONVERSION: Record<string, number> = {
  'mg/l': 1000,
  'mgl': 1000,
  'mg l': 1000,
  'ppm': 1000,
  'ug/l': 1,
  'µg/l': 1,
  'ugl': 1,
  'ppb': 1,
};

/**
 * Parse unit from column header and return conversion factor to ppb
 * Examples:
 * - "As (mg/L)" -> 1000
 * - "Cu_ppb" -> 1
 * - "Arsenic_ug/L" -> 1
 * - "Zinc" -> 1 (default to ppb)
 */
export function parseUnitFromHeader(header: string): number {
  const lowerHeader = header.toLowerCase();
  
  for (const [unit, factor] of Object.entries(UNIT_CONVERSION)) {
    if (lowerHeader.includes(unit)) {
      return factor;
    }
  }
  
  // Default to ppb (no conversion)
  return 1;
}

/**
 * Extract clean column name without unit suffix
 * Examples:
 * - "As (mg/L)" -> "As"
 * - "Cu_ppb" -> "Cu"
 * - "Arsenic_ug/L" -> "Arsenic"
 */
export function cleanColumnName(header: string): string {
  // Remove common unit suffixes and parentheses
  return header
    .replace(/\s*\([^)]*\)\s*/g, '') // Remove (mg/L), (ppb), etc.
    .replace(/_?(mg\/l|mgl|ppm|ug\/l|µg\/l|ugl|ppb)$/i, '') // Remove trailing unit
    .trim();
}
