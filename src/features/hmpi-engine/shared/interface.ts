import {
  HPIClassification,
  MIClassification,
  MIClass,
  WQIClassification,
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
  station_id: string;
  latitude: number | null;
  longitude: number | null;
  state: string | null;
  city: string | null;
  hpi: number | null;
  hpi_classification: HPIClassification | null;
  mi: number | null;
  mi_classification: MIClassification | null;
  mi_class: MIClass | null;
  wqi: number | null;
  wqi_classification: WQIClassification | null;
  cdeg: number | null;
  cdeg_classification: string | null;
  hei: number | null;
  hei_classification: string | null;
  pig: number | null;
  pig_classification: string | null;
  metals_analyzed: string[] | null;
  wqi_params_analyzed: string[] | null;
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
  station_id: string;
  latitude?: number | null;
  longitude?: number | null;
  state?: string | null;
  city?: string | null;
  hpi?: number | null;
  hpi_classification?: HPIClassification | null;
  mi?: number | null;
  mi_classification?: MIClassification | null;
  mi_class?: MIClass | null;
  wqi?: number | null;
  wqi_classification?: WQIClassification | null;
  cdeg?: number | null;
  cdeg_classification?: string | null;
  hei?: number | null;
  hei_classification?: string | null;
  pig?: number | null;
  pig_classification?: string | null;
  metals_analyzed?: string[];
  wqi_params_analyzed?: string[];
  created_by: number;
}

// ============================================================================
// CSV Parsing Interfaces
// ============================================================================

/**
 * Parsed row from CSV with mapped columns
 */
export interface ParsedCSVRow {
  station_id: string;
  latitude?: number;
  longitude?: number;
  state?: string;
  city?: string;
  // Heavy metals (ppb)
  metals: Record<string, number>;
  // WQI parameters
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
  stationIdColumn: string | null;
  latitudeColumn: string | null;
  longitudeColumn: string | null;
  stateColumn: string | null;
  cityColumn: string | null;
  metalColumns: Record<string, string>; // symbol -> column name
  wqiColumns: Record<string, string>; // symbol -> column name
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
}

/**
 * MI calculation result for a single station
 */
export interface MIResult {
  mi: number;
  classification: MIClassification;
  miClass: MIClass;
  metalsAnalyzed: string[];
}

/**
 * WQI calculation result for a single station
 */
export interface WQIResult {
  wqi: number;
  classification: WQIClassification;
  paramsAnalyzed: string[];
}

/**
 * CDEG calculation result for a single station
 */
export interface CDEGResult {
  cdeg: number;
  classification: string;
  metalsAnalyzed: string[];
}

/**
 * HEI calculation result for a single station
 */
export interface HEIResult {
  hei: number;
  classification: string;
  metalsAnalyzed: string[];
}

/**
 * PIG calculation result for a single station
 */
export interface PIGResult {
  pig: number;
  classification: string;
  hpi_used: number;
  hei_used: number;
}

/**
 * Complete calculation result for a single station
 */
export interface StationCalculationResult {
  station_id: string;
  latitude?: number;
  longitude?: number;
  state?: string;
  city?: string;
  hpi?: HPIResult;
  mi?: MIResult;
  wqi?: WQIResult;
  cdeg?: CDEGResult;
  hei?: HEIResult;
  pig?: PIGResult;
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
    station_id: calc.station_id,
    latitude: calc.latitude ? parseFloat(calc.latitude) : null,
    longitude: calc.longitude ? parseFloat(calc.longitude) : null,
    state: calc.state,
    city: calc.city,
    hpi: calc.hpi ? parseFloat(calc.hpi) : null,
    hpi_classification: calc.hpi_classification,
    mi: calc.mi ? parseFloat(calc.mi) : null,
    mi_classification: calc.mi_classification,
    mi_class: calc.mi_class,
    wqi: calc.wqi ? parseFloat(calc.wqi) : null,
    wqi_classification: calc.wqi_classification,
    cdeg: calc.cdeg ? parseFloat(calc.cdeg) : null,
    cdeg_classification: calc.cdeg_classification,
    hei: calc.hei ? parseFloat(calc.hei) : null,
    hei_classification: calc.hei_classification,
    pig: calc.pig ? parseFloat(calc.pig) : null,
    pig_classification: calc.pig_classification,
    metals_analyzed: calc.metals_analyzed ? calc.metals_analyzed.split(',') : null,
    wqi_params_analyzed: calc.wqi_params_analyzed ? calc.wqi_params_analyzed.split(',') : null,
    created_by: calc.created_by,
    created_at: calc.created_at.toISOString(),
    updated_by: calc.updated_by,
    updated_at: calc.updated_at.toISOString(),
    is_deleted: calc.is_deleted,
    deleted_by: calc.deleted_by,
    deleted_at: calc.deleted_at?.toISOString() || null,
  };
}
