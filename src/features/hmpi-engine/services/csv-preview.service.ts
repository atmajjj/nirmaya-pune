/**
 * CSV Preview Service
 *
 * Analyzes CSV files to detect available columns and determine
 * which water quality indices can be calculated.
 */

import { parse } from 'csv-parse/sync';
import {
  METAL_COLUMN_ALIASES,
  WQI_COLUMN_ALIASES,
  LOCATION_COLUMN_ALIASES,
  METAL_STANDARDS,
  WQI_STANDARDS,
  cleanColumnName,
} from '../shared/constants';
import { logger } from '../../../utils/logger';

// ============================================================================
// Types
// ============================================================================

export interface ParameterDetection {
  symbol: string;
  name: string;
  detected_column: string;
}

export interface IndexAvailability {
  available: boolean;
  parameters_detected: ParameterDetection[];
  parameters_missing: string[];
  min_required: number;
  detected_count: number;
}

export interface LocationFieldsDetected {
  station_id: string | null;
  latitude: string | null;
  longitude: string | null;
  state: string | null;
  city: string | null;
}

export interface ValidationWarning {
  type: 'missing_location' | 'few_parameters' | 'empty_rows' | 'duplicate_columns';
  message: string;
}

export interface CSVPreviewResult {
  filename: string;
  total_rows: number;
  valid_rows: number;
  detected_columns: string[];
  location_fields: LocationFieldsDetected;
  available_calculations: {
    hpi: IndexAvailability;
    mi: IndexAvailability;
    wqi: IndexAvailability;
  };
  validation_warnings: ValidationWarning[];
  can_proceed: boolean;
}

// ============================================================================
// Service
// ============================================================================

export class CSVPreviewService {
  // Minimum parameters required for each index
  private static readonly MIN_METALS_FOR_HPI = 3;
  private static readonly MIN_METALS_FOR_MI = 3;
  private static readonly MIN_PARAMS_FOR_WQI = 3;

  /**
   * Preview CSV file and detect available calculations
   */
  static previewCSV(buffer: Buffer, filename: string): CSVPreviewResult {
    const warnings: ValidationWarning[] = [];

    try {
      // Parse CSV to get headers and row count
      const records: Record<string, string>[] = parse(buffer, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relax_column_count: true,
      }) as Record<string, string>[];

      if (records.length === 0) {
        return this.createEmptyResult(filename, warnings);
      }

      // Get headers
      const headers = Object.keys(records[0]);
      const detectedColumns = [...headers];

      // Detect location fields
      const locationFields = this.detectLocationFields(headers);

      // Detect metal columns (for HPI and MI)
      const metalDetection = this.detectMetalColumns(headers);

      // Detect WQI columns
      const wqiDetection = this.detectWQIColumns(headers);

      // Count valid rows (rows with at least some data)
      const validRows = this.countValidRows(records, metalDetection, wqiDetection);

      // Build availability info
      const hpiAvailability = this.buildIndexAvailability(
        metalDetection,
        METAL_STANDARDS,
        this.MIN_METALS_FOR_HPI,
        'HPI'
      );

      const miAvailability = this.buildIndexAvailability(
        metalDetection,
        METAL_STANDARDS,
        this.MIN_METALS_FOR_MI,
        'MI'
      );

      const wqiAvailability = this.buildIndexAvailability(
        wqiDetection,
        WQI_STANDARDS,
        this.MIN_PARAMS_FOR_WQI,
        'WQI'
      );

      // Generate warnings
      this.generateWarnings(
        warnings,
        locationFields,
        hpiAvailability,
        miAvailability,
        wqiAvailability,
        records.length,
        validRows
      );

      // Determine if calculation can proceed
      const canProceed =
        validRows > 0 &&
        (hpiAvailability.available || miAvailability.available || wqiAvailability.available);

      return {
        filename,
        total_rows: records.length,
        valid_rows: validRows,
        detected_columns: detectedColumns,
        location_fields: locationFields,
        available_calculations: {
          hpi: hpiAvailability,
          mi: miAvailability,
          wqi: wqiAvailability,
        },
        validation_warnings: warnings,
        can_proceed: canProceed,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`CSV preview failed: ${message}`);

      warnings.push({
        type: 'empty_rows',
        message: `Failed to parse CSV: ${message}`,
      });

      return this.createEmptyResult(filename, warnings);
    }
  }

  /**
   * Detect location fields from headers
   */
  private static detectLocationFields(headers: string[]): LocationFieldsDetected {
    const headerMap = new Map<string, string>();
    for (const header of headers) {
      headerMap.set(header.toLowerCase().trim(), header);
    }

    const findColumn = (aliases: string[]): string | null => {
      for (const alias of aliases) {
        if (headerMap.has(alias)) {
          return headerMap.get(alias)!;
        }
      }
      return null;
    };

    return {
      station_id: findColumn(LOCATION_COLUMN_ALIASES.station_id),
      latitude: findColumn(LOCATION_COLUMN_ALIASES.latitude),
      longitude: findColumn(LOCATION_COLUMN_ALIASES.longitude),
      state: findColumn(LOCATION_COLUMN_ALIASES.state),
      city: findColumn(LOCATION_COLUMN_ALIASES.city),
    };
  }

  /**
   * Detect metal columns from headers
   */
  private static detectMetalColumns(
    headers: string[]
  ): Map<string, { column: string; name: string }> {
    const detected = new Map<string, { column: string; name: string }>();

    for (const [symbol, aliases] of Object.entries(METAL_COLUMN_ALIASES)) {
      for (const header of headers) {
        const cleanHeader = cleanColumnName(header).toLowerCase();
        if (aliases.includes(cleanHeader)) {
          const standard = METAL_STANDARDS[symbol];
          detected.set(symbol, {
            column: header,
            name: standard?.name || symbol,
          });
          break;
        }
      }
    }

    return detected;
  }

  /**
   * Detect WQI columns from headers
   */
  private static detectWQIColumns(
    headers: string[]
  ): Map<string, { column: string; name: string }> {
    const detected = new Map<string, { column: string; name: string }>();

    for (const [symbol, aliases] of Object.entries(WQI_COLUMN_ALIASES)) {
      for (const header of headers) {
        const cleanHeader = cleanColumnName(header).toLowerCase();
        if (aliases.includes(cleanHeader)) {
          const standard = WQI_STANDARDS[symbol];
          detected.set(symbol, {
            column: header,
            name: standard?.name || symbol,
          });
          break;
        }
      }
    }

    return detected;
  }

  /**
   * Count rows with valid data
   */
  private static countValidRows(
    records: Record<string, string>[],
    metalDetection: Map<string, { column: string; name: string }>,
    wqiDetection: Map<string, { column: string; name: string }>
  ): number {
    let validCount = 0;

    for (const record of records) {
      let hasData = false;

      // Check if row has any metal data
      for (const { column } of metalDetection.values()) {
        const value = record[column];
        if (value && !isNaN(parseFloat(value))) {
          hasData = true;
          break;
        }
      }

      // Check if row has any WQI data
      if (!hasData) {
        for (const { column } of wqiDetection.values()) {
          const value = record[column];
          if (value && !isNaN(parseFloat(value))) {
            hasData = true;
            break;
          }
        }
      }

      if (hasData) {
        validCount++;
      }
    }

    return validCount;
  }

  /**
   * Build index availability info
   */
  private static buildIndexAvailability(
    detected: Map<string, { column: string; name: string }>,
    standards: Record<string, { symbol: string; name: string }>,
    minRequired: number,
    _indexName: string
  ): IndexAvailability {
    const parametersDetected: ParameterDetection[] = [];
    const parametersMissing: string[] = [];

    // Build detected list
    for (const [symbol, { column, name }] of detected.entries()) {
      parametersDetected.push({
        symbol,
        name,
        detected_column: column,
      });
    }

    // Build missing list (all standards not detected)
    for (const [symbol, standard] of Object.entries(standards)) {
      if (!detected.has(symbol)) {
        parametersMissing.push(`${standard.name} (${symbol})`);
      }
    }

    return {
      available: detected.size >= minRequired,
      parameters_detected: parametersDetected,
      parameters_missing: parametersMissing,
      min_required: minRequired,
      detected_count: detected.size,
    };
  }

  /**
   * Generate validation warnings
   */
  private static generateWarnings(
    warnings: ValidationWarning[],
    locationFields: LocationFieldsDetected,
    hpi: IndexAvailability,
    mi: IndexAvailability,
    wqi: IndexAvailability,
    totalRows: number,
    validRows: number
  ): void {
    // Check location fields
    if (!locationFields.station_id) {
      warnings.push({
        type: 'missing_location',
        message: 'No station ID column detected. Row numbers will be used as station IDs.',
      });
    }

    if (!locationFields.latitude || !locationFields.longitude) {
      warnings.push({
        type: 'missing_location',
        message: 'Latitude and/or longitude columns not detected. Geographic mapping will be limited.',
      });
    }

    // Check parameter counts
    if (hpi.detected_count > 0 && hpi.detected_count < hpi.min_required) {
      warnings.push({
        type: 'few_parameters',
        message: `Only ${hpi.detected_count} metal(s) detected for HPI. Minimum ${hpi.min_required} recommended for reliable results.`,
      });
    }

    if (wqi.detected_count > 0 && wqi.detected_count < wqi.min_required) {
      warnings.push({
        type: 'few_parameters',
        message: `Only ${wqi.detected_count} WQI parameter(s) detected. Minimum ${wqi.min_required} recommended for reliable results.`,
      });
    }

    // Check empty rows
    const emptyRows = totalRows - validRows;
    if (emptyRows > 0) {
      warnings.push({
        type: 'empty_rows',
        message: `${emptyRows} row(s) have no numeric data and will be skipped.`,
      });
    }

    // No calculations available
    if (!hpi.available && !mi.available && !wqi.available) {
      if (hpi.detected_count === 0 && wqi.detected_count === 0) {
        warnings.push({
          type: 'few_parameters',
          message: 'No recognized water quality parameters found. Please check column names match expected formats (e.g., "Arsenic", "As", "pH", "TDS").',
        });
      }
    }
  }

  /**
   * Create empty result for invalid CSV
   */
  private static createEmptyResult(
    filename: string,
    warnings: ValidationWarning[]
  ): CSVPreviewResult {
    return {
      filename,
      total_rows: 0,
      valid_rows: 0,
      detected_columns: [],
      location_fields: {
        station_id: null,
        latitude: null,
        longitude: null,
        state: null,
        city: null,
      },
      available_calculations: {
        hpi: {
          available: false,
          parameters_detected: [],
          parameters_missing: Object.values(METAL_STANDARDS).map(
            (s) => `${s.name} (${s.symbol})`
          ),
          min_required: this.MIN_METALS_FOR_HPI,
          detected_count: 0,
        },
        mi: {
          available: false,
          parameters_detected: [],
          parameters_missing: Object.values(METAL_STANDARDS).map(
            (s) => `${s.name} (${s.symbol})`
          ),
          min_required: this.MIN_METALS_FOR_MI,
          detected_count: 0,
        },
        wqi: {
          available: false,
          parameters_detected: [],
          parameters_missing: Object.values(WQI_STANDARDS).map(
            (s) => `${s.name} (${s.symbol})`
          ),
          min_required: this.MIN_PARAMS_FOR_WQI,
          detected_count: 0,
        },
      },
      validation_warnings: warnings,
      can_proceed: false,
    };
  }
}
