import { parse } from 'csv-parse/sync';
import {
  ParsedCSVRow,
  ColumnMapping,
  CSVParseResult,
  CSVParseError,
} from '../shared/interface';
import {
  METAL_COLUMN_ALIASES,
  WQI_COLUMN_ALIASES,
  LOCATION_COLUMN_ALIASES,
  parseUnitFromHeader,
  cleanColumnName,
} from '../shared/constants';
import { logger } from '../../../utils/logger';

/**
 * CSV Parser Service
 *
 * Parses CSV files with flexible column mapping for water quality data.
 * Handles various column naming conventions and unit conversions.
 */
export class CSVParserService {
  /**
   * Parse CSV buffer into structured rows
   */
  static parseCSV(buffer: Buffer): CSVParseResult {
    const errors: CSVParseError[] = [];
    const warnings: string[] = [];

    try {
      // Parse CSV content
      const records: Record<string, string>[] = parse(buffer, {
        columns: true, // Use first row as headers
        skip_empty_lines: true,
        trim: true,
        relax_column_count: true,
      }) as Record<string, string>[];

      if (records.length === 0) {
        return {
          success: false,
          rows: [],
          columnMapping: this.createEmptyMapping(),
          errors: [{ row: 0, message: 'CSV file is empty or has no data rows' }],
          warnings: [],
          totalRows: 0,
          validRows: 0,
        };
      }

      // Get headers from first record
      const headers = Object.keys(records[0]);
      logger.info(`CSV headers found: ${headers.join(', ')}`);

      // Map columns
      const columnMapping = this.mapColumns(headers);
      this.logColumnMapping(columnMapping, warnings);

      // Parse each row
      const parsedRows: ParsedCSVRow[] = [];
      let validRows = 0;

      for (let i = 0; i < records.length; i++) {
        const rowNumber = i + 2; // +2 because row 1 is headers, and we're 1-indexed
        const record = records[i];

        try {
          const parsedRow = this.parseRow(record, columnMapping, rowNumber);
          if (parsedRow) {
            parsedRows.push(parsedRow);
            validRows++;
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          errors.push({ row: rowNumber, message });
        }
      }

      return {
        success: errors.length === 0,
        rows: parsedRows,
        columnMapping,
        errors,
        warnings,
        totalRows: records.length,
        validRows,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`CSV parsing failed: ${message}`);
      return {
        success: false,
        rows: [],
        columnMapping: this.createEmptyMapping(),
        errors: [{ row: 0, message: `CSV parsing failed: ${message}` }],
        warnings: [],
        totalRows: 0,
        validRows: 0,
      };
    }
  }

  /**
   * Map CSV columns to expected fields
   */
  private static mapColumns(headers: string[]): ColumnMapping {
    const mapping: ColumnMapping = {
      snoColumn: null,
      stationIdColumn: null,
      stateColumn: null,
      districtColumn: null,
      locationColumn: null,
      longitudeColumn: null,
      latitudeColumn: null,
      yearColumn: null,
      cityColumn: null,
      metalColumns: {},
      wqiColumns: {},
    };

    // Create a map of lowercase header to original header
    const headerMap = new Map<string, string>();
    for (const header of headers) {
      headerMap.set(header.toLowerCase().trim(), header);
    }

    // Map S.No column
    for (const alias of LOCATION_COLUMN_ALIASES.sno) {
      if (headerMap.has(alias)) {
        mapping.snoColumn = headerMap.get(alias)!;
        break;
      }
    }

    // Map station ID column
    for (const alias of LOCATION_COLUMN_ALIASES.station_id) {
      if (headerMap.has(alias)) {
        mapping.stationIdColumn = headerMap.get(alias)!;
        break;
      }
    }

    for (const alias of LOCATION_COLUMN_ALIASES.latitude) {
      if (headerMap.has(alias)) {
        mapping.latitudeColumn = headerMap.get(alias)!;
        break;
      }
    }

    for (const alias of LOCATION_COLUMN_ALIASES.longitude) {
      if (headerMap.has(alias)) {
        mapping.longitudeColumn = headerMap.get(alias)!;
        break;
      }
    }

    for (const alias of LOCATION_COLUMN_ALIASES.state) {
      if (headerMap.has(alias)) {
        mapping.stateColumn = headerMap.get(alias)!;
        break;
      }
    }

    for (const alias of LOCATION_COLUMN_ALIASES.district) {
      if (headerMap.has(alias)) {
        mapping.districtColumn = headerMap.get(alias)!;
        break;
      }
    }

    for (const alias of LOCATION_COLUMN_ALIASES.location) {
      if (headerMap.has(alias)) {
        mapping.locationColumn = headerMap.get(alias)!;
        break;
      }
    }

    for (const alias of LOCATION_COLUMN_ALIASES.city) {
      if (headerMap.has(alias)) {
        mapping.cityColumn = headerMap.get(alias)!;
        break;
      }
    }

    for (const alias of LOCATION_COLUMN_ALIASES.year) {
      if (headerMap.has(alias)) {
        mapping.yearColumn = headerMap.get(alias)!;
        break;
      }
    }

    // Map metal columns
    for (const [symbol, aliases] of Object.entries(METAL_COLUMN_ALIASES)) {
      for (const header of headers) {
        const cleanHeader = cleanColumnName(header).toLowerCase();
        if (aliases.includes(cleanHeader)) {
          mapping.metalColumns[symbol] = header;
          break;
        }
      }
    }

    // Map WQI columns
    for (const [symbol, aliases] of Object.entries(WQI_COLUMN_ALIASES)) {
      for (const header of headers) {
        const cleanHeader = cleanColumnName(header).toLowerCase();
        if (aliases.includes(cleanHeader)) {
          mapping.wqiColumns[symbol] = header;
          break;
        }
      }
    }

    return mapping;
  }

  /**
   * Parse a single row using column mapping
   */
  private static parseRow(
    record: Record<string, string>,
    mapping: ColumnMapping,
    rowNumber: number
  ): ParsedCSVRow | null {
    // Parse S.No
    const sno = mapping.snoColumn
      ? this.parseNumber(record[mapping.snoColumn])
      : undefined;

    // Get station ID (required)
    let stationId: string;
    if (mapping.stationIdColumn && record[mapping.stationIdColumn]) {
      stationId = record[mapping.stationIdColumn].trim();
    } else {
      // Generate station ID from row number if not found
      stationId = `Station ${rowNumber - 1}`;
    }

    if (!stationId) {
      throw new Error('Station ID is empty');
    }

    // Parse location data
    const latitude = mapping.latitudeColumn
      ? this.parseNumber(record[mapping.latitudeColumn])
      : undefined;
    const longitude = mapping.longitudeColumn
      ? this.parseNumber(record[mapping.longitudeColumn])
      : undefined;
    const state = mapping.stateColumn
      ? record[mapping.stateColumn]?.trim() || undefined
      : undefined;
    const district = mapping.districtColumn
      ? record[mapping.districtColumn]?.trim() || undefined
      : undefined;
    const location = mapping.locationColumn
      ? record[mapping.locationColumn]?.trim() || undefined
      : undefined;
    const city = mapping.cityColumn
      ? record[mapping.cityColumn]?.trim() || undefined
      : undefined;
    const year = mapping.yearColumn
      ? this.parseNumber(record[mapping.yearColumn])
      : undefined;

    // Parse metal concentrations (convert to ppb)
    const metals: Record<string, number> = {};
    for (const [symbol, column] of Object.entries(mapping.metalColumns)) {
      const value = this.parseNumber(record[column]);
      if (value !== undefined && !isNaN(value)) {
        // Apply unit conversion
        const conversionFactor = parseUnitFromHeader(column);
        metals[symbol] = value * conversionFactor;
      }
    }

    // Parse WQI parameters
    const wqiParams: Record<string, number> = {};
    for (const [symbol, column] of Object.entries(mapping.wqiColumns)) {
      const value = this.parseNumber(record[column]);
      if (value !== undefined && !isNaN(value)) {
        wqiParams[symbol] = value;
      }
    }

    // Check if we have any data to calculate
    if (Object.keys(metals).length === 0 && Object.keys(wqiParams).length === 0) {
      throw new Error('No metal or WQI parameter values found in row');
    }

    return {
      sno,
      station_id: stationId,
      state,
      district,
      location,
      longitude,
      latitude,
      year,
      city,
      metals,
      wqiParams,
      rawRow: record,
      rowNumber,
    };
  }

  /**
   * Parse a string to number, handling various formats
   */
  private static parseNumber(value: string | undefined): number | undefined {
    if (value === undefined || value === null || value.trim() === '') {
      return undefined;
    }

    // Remove any non-numeric characters except decimal point and minus
    const cleaned = value.trim().replace(/[^0-9.-]/g, '');
    if (cleaned === '' || cleaned === '-' || cleaned === '.') {
      return undefined;
    }

    const num = parseFloat(cleaned);
    return isNaN(num) ? undefined : num;
  }

  /**
   * Create empty column mapping
   */
  private static createEmptyMapping(): ColumnMapping {
    return {
      snoColumn: null,
      stationIdColumn: null,
      stateColumn: null,
      districtColumn: null,
      locationColumn: null,
      longitudeColumn: null,
      latitudeColumn: null,
      yearColumn: null,
      cityColumn: null,
      metalColumns: {},
      wqiColumns: {},
    };
  }

  /**
   * Log column mapping results and add warnings
   */
  private static logColumnMapping(mapping: ColumnMapping, warnings: string[]): void {
    const metalCount = Object.keys(mapping.metalColumns).length;
    const wqiCount = Object.keys(mapping.wqiColumns).length;

    logger.info(`Column mapping complete:
      - S.No: ${mapping.snoColumn || 'NOT FOUND'}
      - Station ID: ${mapping.stationIdColumn || 'NOT FOUND (will auto-generate)'}
      - State: ${mapping.stateColumn || 'NOT FOUND'}
      - District: ${mapping.districtColumn || 'NOT FOUND'}
      - Location: ${mapping.locationColumn || 'NOT FOUND'}
      - Longitude: ${mapping.longitudeColumn || 'NOT FOUND'}
      - Latitude: ${mapping.latitudeColumn || 'NOT FOUND'}
      - Year: ${mapping.yearColumn || 'NOT FOUND'}
      - City: ${mapping.cityColumn || 'NOT FOUND'}
      - Metals found: ${metalCount} (${Object.keys(mapping.metalColumns).join(', ')})
      - WQI params found: ${wqiCount} (${Object.keys(mapping.wqiColumns).join(', ')})`);

    if (metalCount === 0) {
      warnings.push('No heavy metal columns found. HPI and MI cannot be calculated.');
    } else if (metalCount < 3) {
      warnings.push(`Only ${metalCount} metal columns found. Results may be less accurate.`);
    }

    if (wqiCount === 0) {
      warnings.push('No WQI parameter columns found. WQI cannot be calculated.');
    } else if (wqiCount < 5) {
      warnings.push(`Only ${wqiCount} WQI parameter columns found. Results may be less accurate.`);
    }

    if (!mapping.stationIdColumn) {
      warnings.push('No station ID column found. Station IDs will be auto-generated.');
    }
  }
}
