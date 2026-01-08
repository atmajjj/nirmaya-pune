import {
  HPIClassification,
  MIClassification,
  MIClass,
  WQIClassification,
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
 * Metals used for HPI calculation (based on BIS 1991 - Table 3)
 * Only these 5 metals are included in the HPI calculation to match the reference methodology
 */
export const HPI_METALS = ['Fe', 'Zn', 'Cd', 'Cu', 'Pb'] as const;

/**
 * Heavy metal standards based on BIS 10500:2012 (Indian Standard)
 * Si = Standard permissible limit (ppb)
 * Ii = Ideal/desirable value (ppb) - from research papers
 * 
 * Reference: BIS 10500:2012, WHO Guidelines, and latest HPI research papers (2023-2025)
 */
export const METAL_STANDARDS: Record<string, MetalStandard> = {
  // BIS 10500:2012 Standards (ppb)
  As: { symbol: 'As', name: 'Arsenic', Si: 10, Ii: 0, MAC: 50 },        // BIS: 10 ppb
  Cu: { symbol: 'Cu', name: 'Copper', Si: 50, Ii: 0, MAC: 1500 },       // BIS: 50 ppb (acceptable)
  Zn: { symbol: 'Zn', name: 'Zinc', Si: 5000, Ii: 3000, MAC: 15000 },   // BIS: 5000 ppb
  Hg: { symbol: 'Hg', name: 'Mercury', Si: 1, Ii: 0, MAC: 1 },          // BIS: 1 ppb
  Cd: { symbol: 'Cd', name: 'Cadmium', Si: 3, Ii: 0, MAC: 3 },          // BIS: 3 ppb
  Ni: { symbol: 'Ni', name: 'Nickel', Si: 20, Ii: 0, MAC: 20 },         // BIS: 20 ppb
  Pb: { symbol: 'Pb', name: 'Lead', Si: 10, Ii: 0, MAC: 10 },           // BIS: 10 ppb
  Cr: { symbol: 'Cr', name: 'Chromium', Si: 50, Ii: 0, MAC: 50 },       // BIS: 50 ppb
  Fe: { symbol: 'Fe', name: 'Iron', Si: 300, Ii: 0, MAC: 1000 },        // BIS: 300 ppb (acceptable)
  Mn: { symbol: 'Mn', name: 'Manganese', Si: 100, Ii: 0, MAC: 300 },    // BIS: 100 ppb (acceptable)
  Al: { symbol: 'Al', name: 'Aluminum', Si: 30, Ii: 0, MAC: 200 },      // BIS: 30 ppb (acceptable)
  Ba: { symbol: 'Ba', name: 'Barium', Si: 700, Ii: 0, MAC: 700 },       // BIS: 700 ppb
  Se: { symbol: 'Se', name: 'Selenium', Si: 10, Ii: 0, MAC: 10 },       // BIS: 10 ppb
  Ag: { symbol: 'Ag', name: 'Silver', Si: 100, Ii: 0, MAC: 100 },       // BIS: 100 ppb
  Mo: { symbol: 'Mo', name: 'Molybdenum', Si: 70, Ii: 0, MAC: 70 },     // BIS: 70 ppb
  Sb: { symbol: 'Sb', name: 'Antimony', Si: 20, Ii: 0, MAC: 20 },       // BIS: 20 ppb (WHO)
  Co: { symbol: 'Co', name: 'Cobalt', Si: 50, Ii: 0, MAC: 50 },         // WHO guideline
  V: { symbol: 'V', name: 'Vanadium', Si: 100, Ii: 0, MAC: 100 },       // WHO guideline
  U: { symbol: 'U', name: 'Uranium', Si: 30, Ii: 0, MAC: 30 },          // BIS: 30 ppb
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
// WQI Parameters (BIS Standards)
// ============================================================================

/**
 * WQI parameter definition
 * Sn = Standard (permissible limit)
 * Vo = Ideal value
 */
export interface WQIStandard {
  symbol: string;
  name: string;
  Sn: number; // Standard (permissible limit)
  Vo: number; // Ideal value
  unit: string;
}

/**
 * WQI parameter standards based on BIS 10500:2012
 */
export const WQI_STANDARDS: Record<string, WQIStandard> = {
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
 * Column name aliases for WQI parameters (case-insensitive matching)
 */
export const WQI_COLUMN_ALIASES: Record<string, string[]> = {
  pH: ['ph'],
  EC: ['ec', 'electrical_conductivity', 'electrical conductivity', 'conductivity'],
  TDS: ['tds', 'total_dissolved_solids', 'total dissolved solids'],
  TH: ['th', 'total_hardness', 'total hardness', 'hardness', 'caco3'], // ADD: CaCO3 alias
  Ca: ['ca', 'calcium'],
  Mg: ['mg', 'magnesium'],
  Fe: ['fe', 'iron'], // Note: Also used for heavy metals, WQI uses mg/L
  F: ['f', 'fluoride', 'flouride'], // Common misspelling included
  Turbidity: ['turbidity', 'turb', 'ntu', 'hazen'], // ADD: Hazen alias
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

/**
 * Classify WQI value
 * WQI 0-25: Excellent
 * WQI 26-50: Good
 * WQI 51-75: Poor
 * WQI 76-100: Very Poor
 * WQI > 100: Unfit for consumption
 */
export function classifyWQI(wqi: number): WQIClassification {
  if (wqi <= 25) return 'Excellent';
  if (wqi <= 50) return 'Good';
  if (wqi <= 75) return 'Poor';
  if (wqi <= 100) return 'Very Poor';
  return 'Unfit for consumption';
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
