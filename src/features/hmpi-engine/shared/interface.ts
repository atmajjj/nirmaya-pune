import {
  HPIClassification,
  MIClassification,
  MIClass,
  waterQualityCalculations,
} from './schema';

// ============================================================================
// Water Quality Calculation Interfaces
// ============================================================================

/**
 * Water quality calculation entity interface
 * Used for API responses
 */
export interface WaterQualityCalculation {
  id: number;
  upload_id: number;
  sno: number | null;
  station_id: string;
  state: string | null;
  district: string | null;
  location: string | null;
  longitude: number | null;
  latitude: number | null;
  year: number | null;
  city: string | null; // Kept for backward compatibility
  hpi: number | null;
  hpi_classification: HPIClassification | null;
  mi: number | null;
  mi_classification: MIClassification | null;
  mi_class: MIClass | null;
  wqi: number | null;
  wqi_classification: string | null;
  metals_analyzed: string[] | null;
  params_analyzed: string[] | null;
  created_by: number | null;
  created_at: string;
  updated_by: number | null;
  updated_at: string;
  is_deleted: boolean;
  deleted_by: number | null;
  deleted_at: string | null;
}

/**
 * Input for creating a new calculation
 */
export interface NewCalculationInput {
  upload_id: number;
  sno?: number | null;
  station_id: string;
  state?: string | null;
  district?: string | null;
  location?: string | null;
  longitude?: number | null;
  latitude?: number | null;
  year?: number | null;
  city?: string | null; // Kept for backward compatibility
  hpi?: number | null;
  hpi_classification?: HPIClassification | null;
  mi?: number | null;
  mi_classification?: MIClassification | null;
  mi_class?: MIClass | null;
  wqi?: number | null;
  wqi_classification?: string | null;
  metals_analyzed?: string[];
  params_analyzed?: string[];
  created_by: number;
}

// ============================================================================
// CSV Parsing Interfaces
// ============================================================================

/**
 * Parsed row from CSV with mapped columns
 */
export interface ParsedCSVRow {
  sno?: number;
  station_id: string;
  state?: string;
  district?: string;
  location?: string;
  longitude?: number;
  latitude?: number;
  year?: number;
  city?: string;
  // Heavy metals (ppb)
  metals: Record<string, number>;
  // WQI parameters (pH, TDS, TH, etc.)
  wqiParams: Record<string, number>;
  // Raw row data for reference
  rawRow: Record<string, string>;
  // Row number for error reporting
  rowNumber: number;
}

/**
 * CSV column mapping result
 */
export interface ColumnMapping {
  snoColumn: string | null;
  stationIdColumn: string | null;
  stateColumn: string | null;
  districtColumn: string | null;
  locationColumn: string | null;
  longitudeColumn: string | null;
  latitudeColumn: string | null;
  yearColumn: string | null;
  cityColumn: string | null;
  metalColumns: Record<string, string>; // symbol -> column name
}

/**
 * CSV parsing result
 */
export interface CSVParseResult {
  success: boolean;
  rows: ParsedCSVRow[];
  columnMapping: ColumnMapping;
  errors: CSVParseError[];
  warnings: string[];
  totalRows: number;
  validRows: number;
}

/**
 * CSV parsing error
 */
export interface CSVParseError {
  row: number;
  column?: string;
  message: string;
}

// ============================================================================
// Calculator Interfaces
// ============================================================================

/**
 * HPI calculation result for a single station
 */
export interface HPIResult {
  hpi: number;
  classification: HPIClassification;
  metalsAnalyzed: string[];
  // Detailed breakdown for transparency (optional)
  subIndices?: Record<string, number>;      // Qi values
  unitWeights?: Record<string, number>;     // Wi values
  contributions?: Record<string, number>;   // WiQi values
  sumWi?: number;                           // Sum of Wi
  sumWiQi?: number;                         // Sum of WiQi
}

/**
 * MI calculation result for a single station
 */
export interface MIResult {
  mi: number;
  classification: MIClassification;
  miClass: MIClass;
  status: 'Safe' | 'Moderate' | 'Critical';
  color: string;
  metalsAnalyzed: string[];
  // Detailed breakdown for transparency
  ratios?: Record<string, number>;          // Ci/MACi for each metal
  concentrations?: Record<string, number>;  // Ci values
  macValues?: Record<string, number>;       // MACi values
}

/**
 * WQI calculation result for a single station
 */
export interface WQIResult {
  wqi: number;
  classification: string;
  paramsAnalyzed: string[];
  // Detailed breakdown for transparency
  weights?: Record<string, number>;         // Wi values
  qualityRatings?: Record<string, number>;  // Qi values
  contributions?: Record<string, number>;   // WiQi values
  K?: number;                               // Proportionality constant
  sumInvSn?: number;                        // Sum of 1/Sn
  invSn?: Record<string, number>;           // 1/Sn for each parameter
}


/**
 * Complete calculation result for a single station
 */
export interface StationCalculationResult {
  sno?: number;
  station_id: string;
  state?: string;
  district?: string;
  location?: string;
  longitude?: number;
  latitude?: number;
  year?: number;
  city?: string;
  hpi?: HPIResult;
  mi?: MIResult;
  wqi?: WQIResult;
  errors: string[];
}

/**
 * Batch calculation result
 */
export interface BatchCalculationResult {
  upload_id: number;
  total_stations: number;
  processed_stations: number;
  failed_stations: number;
  calculations: WaterQualityCalculation[];
  errors: Array<{ station_id: string; error: string }>;
}

// ============================================================================
// API Response Interfaces
// ============================================================================

/**
 * Statistics response
 */
export interface WaterQualityStats {
  total_calculations: number;
  total_uploads: number;
  by_hpi_classification: Record<string, number>;
  by_mi_classification: Record<string, number>;
  by_wqi_classification: Record<string, number>;
  by_state: Record<string, number>;
  averages: {
    hpi: number;
    mi: number;
    wqi: number;
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Convert Drizzle calculation record to API response format
 * Centralizes conversions and handles decimal/string conversions
 */
export function convertCalculation(
  calc: typeof waterQualityCalculations.$inferSelect
): WaterQualityCalculation {
  return {
    id: calc.id,
    upload_id: calc.upload_id,
    sno: calc.sno,
    station_id: calc.station_id,
    state: calc.state,
    district: calc.district,
    location: calc.location,
    longitude: calc.longitude ? parseFloat(calc.longitude) : null,
    latitude: calc.latitude ? parseFloat(calc.latitude) : null,
    year: calc.year,
    city: calc.city,
    hpi: calc.hpi ? parseFloat(calc.hpi) : null,
    hpi_classification: calc.hpi_classification,
    mi: calc.mi ? parseFloat(calc.mi) : null,
    mi_classification: calc.mi_classification,
    mi_class: calc.mi_class,
    wqi: calc.wqi ? parseFloat(calc.wqi) : null,
    wqi_classification: calc.wqi_classification,
    metals_analyzed: calc.metals_analyzed ? calc.metals_analyzed.split(',') : null,
    params_analyzed: calc.params_analyzed ? calc.params_analyzed.split(',') : null,
    created_by: calc.created_by,
    created_at: calc.created_at.toISOString(),
    updated_by: calc.updated_by,
    updated_at: calc.updated_at.toISOString(),
    is_deleted: calc.is_deleted,
    deleted_by: calc.deleted_by,
    deleted_at: calc.deleted_at?.toISOString() || null,
  };
}
