/**
 * Water Quality Calculation Orchestrator Service
 *
 * This service orchestrates the calculation of HPI and MI indices
 * by coordinating:
 * 1. CSV parsing
 * 2. Individual calculator invocations
 * 3. Database storage
 * 4. Result compilation
 */

import { db } from '../../../database/drizzle';
import { waterQualityCalculations } from '../shared/schema';
import {
  ParsedCSVRow,
  StationCalculationResult,
  BatchCalculationResult,
  NewCalculationInput,
  convertCalculation,
} from '../shared/interface';
import { HPICalculatorService } from './hpi-calculator.service';
import { MICalculatorService } from './mi-calculator.service';
import { CSVParserService } from './csv-parser.service';

/**
 * Water Quality Calculation Service
 * Orchestrates parsing, calculation, and storage of water quality indices
 */
export class WaterQualityCalculationService {
  /**
   * Process a CSV file and calculate all indices for each station
   *
   * @param csvContent - Raw CSV file content (string or Buffer)
   * @param uploadId - ID of the upload record
   * @param userId - ID of the user performing the calculation
   * @returns BatchCalculationResult with all calculations
   */
  static async processCSV(
    csvContent: string | Buffer,
    uploadId: number,
    userId: number
  ): Promise<BatchCalculationResult> {
    // Convert string to Buffer if necessary
    const buffer = typeof csvContent === 'string' 
      ? Buffer.from(csvContent, 'utf-8') 
      : csvContent;
    
    // Parse CSV
    const parseResult = CSVParserService.parseCSV(buffer);

    if (!parseResult.success || parseResult.validRows === 0) {
      return {
        upload_id: uploadId,
        total_stations: 0,
        processed_stations: 0,
        failed_stations: 0,
        calculations: [],
        errors: parseResult.errors.map((e) => ({
          station_id: `Row ${e.row}`,
          error: e.message,
        })),
      };
    }

    // Calculate indices for each station
    const stationResults = this.calculateAllIndices(parseResult.rows);

    // Save to database
    const savedCalculations = await this.saveCalculations(
      stationResults,
      uploadId,
      userId
    );

    // Compile results
    const failedStations = stationResults.filter((r) => r.errors.length > 0);

    return {
      upload_id: uploadId,
      total_stations: parseResult.validRows,
      processed_stations: savedCalculations.length,
      failed_stations: failedStations.length,
      calculations: savedCalculations,
      errors: failedStations.map((r) => ({
        station_id: r.station_id,
        error: r.errors.join('; '),
      })),
    };
  }

  /**
   * Calculate all indices (HPI, MI) for parsed CSV rows
   *
   * @param rows - Parsed CSV rows
   * @returns Array of calculation results per station
   */
  static calculateAllIndices(rows: ParsedCSVRow[]): StationCalculationResult[] {
    return rows.map((row) => {
      const result: StationCalculationResult = {
        sno: row.sno,
        station_id: row.station_id,
        state: row.state,
        district: row.district,
        location: row.location,
        longitude: row.longitude,
        latitude: row.latitude,
        year: row.year,
        city: row.city,
        errors: [],
      };

      // Calculate HPI (if metals data available)
      if (Object.keys(row.metals).length > 0) {
        try {
          const hpiResult = HPICalculatorService.calculate(row.metals);
          if (hpiResult) {
            result.hpi = hpiResult;
          } else {
            result.errors.push('HPI: No valid metals for calculation');
          }
        } catch (error) {
          result.errors.push(`HPI calculation error: ${error}`);
        }

        // Calculate MI (uses same metals data)
        try {
          const miResult = MICalculatorService.calculate(row.metals);
          if (miResult) {
            result.mi = miResult;
          } else {
            result.errors.push('MI: No valid metals for calculation');
          }
        } catch (error) {
          result.errors.push(`MI calculation error: ${error}`);
        }
      }

      return result;
    });
  }

  /**
   * Save calculation results to database
   *
   * @param results - Array of station calculation results
   * @param uploadId - ID of the upload record
   * @param userId - ID of the user performing the calculation
   * @returns Array of saved calculation records
   */
  static async saveCalculations(
    results: StationCalculationResult[],
    uploadId: number,
    userId: number
  ) {
    const calculations = [];

    for (const result of results) {
      // Skip stations with no calculations
      if (!result.hpi && !result.mi) {
        continue;
      }

      const input: NewCalculationInput = {
        upload_id: uploadId,
        sno: result.sno,
        station_id: result.station_id,
        state: result.state,
        district: result.district,
        location: result.location,
        longitude: result.longitude,
        latitude: result.latitude,
        year: result.year,
        city: result.city,
        created_by: userId,
      };

      // Add HPI data
      if (result.hpi) {
        input.hpi = result.hpi.hpi;
        input.hpi_classification = result.hpi.classification;
        input.metals_analyzed = result.hpi.metalsAnalyzed;
      }

      // Add MI data
      if (result.mi) {
        input.mi = result.mi.mi;
        input.mi_classification = result.mi.classification;
        input.mi_class = result.mi.miClass;
        // If metals weren't set by HPI, use MI's metals
        if (!input.metals_analyzed) {
          input.metals_analyzed = result.mi.metalsAnalyzed;
        }
      }

      // Save to database
      const [saved] = await db
        .insert(waterQualityCalculations)
        .values({
          upload_id: input.upload_id,
          sno: input.sno,
          station_id: input.station_id,
          state: input.state,
          district: input.district,
          location: input.location,
          longitude: input.longitude?.toString(),
          latitude: input.latitude?.toString(),
          year: input.year,
          city: input.city,
          hpi: input.hpi?.toString(),
          hpi_classification: input.hpi_classification,
          mi: input.mi?.toString(),
          mi_classification: input.mi_classification,
          mi_class: input.mi_class,
          metals_analyzed: input.metals_analyzed?.join(','),
          created_by: input.created_by,
          updated_by: input.created_by,
        })
        .returning();

      calculations.push(convertCalculation(saved));
    }

    return calculations;
  }

  /**
   * Calculate indices for a single station (manual input)
   *
   * @param stationId - Station identifier
   * @param metals - Metal concentrations in ppb
   * @param location - Optional location data
   * @returns StationCalculationResult
   */
  static calculateSingle(
    stationId: string,
    metals: Record<string, number>,
    location?: {
      latitude?: number;
      longitude?: number;
      state?: string;
      city?: string;
    }
  ): StationCalculationResult {
    const result: StationCalculationResult = {
      station_id: stationId,
      latitude: location?.latitude,
      longitude: location?.longitude,
      state: location?.state,
      city: location?.city,
      errors: [],
    };

    // Calculate HPI
    if (Object.keys(metals).length > 0) {
      const hpiResult = HPICalculatorService.calculate(metals);
      if (hpiResult) {
        result.hpi = hpiResult;
      }

      // Calculate MI
      const miResult = MICalculatorService.calculate(metals);
      if (miResult) {
        result.mi = miResult;
      }
    }

    return result;
  }

  /**
   * Validate input data before calculation
   *
   * @param metals - Metal concentrations
   * @returns Object containing all validation warnings
   */
  static validateInputData(
    metals: Record<string, number>
  ): {
    metalWarnings: string[];
    isValid: boolean;
  } {
    const metalWarnings = [
      ...HPICalculatorService.validateMetals(metals),
      ...MICalculatorService.validateMetals(metals),
    ];

    // Remove duplicates
    const uniqueMetalWarnings = [...new Set(metalWarnings)];

    return {
      metalWarnings: uniqueMetalWarnings,
      isValid: uniqueMetalWarnings.length === 0,
    };
  }

  /**
   * Generate summary statistics for a batch of calculations
   *
   * @param calculations - Array of calculation results
   * @returns Summary statistics
   */
  static generateSummary(calculations: StationCalculationResult[]): {
    total: number;
    hpiCount: number;
    miCount: number;
    hpiAvg: number | null;
    miAvg: number | null;
    hpiByClassification: Record<string, number>;
    miByClassification: Record<string, number>;
  } {
    const hpiValues = calculations
      .filter((c) => c.hpi)
      .map((c) => c.hpi!.hpi);
    const miValues = calculations
      .filter((c) => c.mi)
      .map((c) => c.mi!.mi);

    const hpiByClassification: Record<string, number> = {};
    const miByClassification: Record<string, number> = {};

    for (const calc of calculations) {
      if (calc.hpi) {
        hpiByClassification[calc.hpi.classification] =
          (hpiByClassification[calc.hpi.classification] || 0) + 1;
      }
      if (calc.mi) {
        miByClassification[calc.mi.classification] =
          (miByClassification[calc.mi.classification] || 0) + 1;
      }
    }

    return {
      total: calculations.length,
      hpiCount: hpiValues.length,
      miCount: miValues.length,
      hpiAvg:
        hpiValues.length > 0
          ? Math.round(
              (hpiValues.reduce((a, b) => a + b, 0) / hpiValues.length) * 100
            ) / 100
          : null,
      miAvg:
        miValues.length > 0
          ? Math.round(
              (miValues.reduce((a, b) => a + b, 0) / miValues.length) * 10000
            ) / 10000
          : null,
      hpiByClassification,
      miByClassification,
    };
  }
}
