/**
 * Water Quality Calculation Orchestrator Service
 *
 * This service orchestrates the calculation of all three indices (HPI, MI, WQI)
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
import { WQICalculatorService } from './wqi-calculator.service';
import { CDEGCalculatorService } from './cdeg-calculator.service';
import { HEICalculatorService } from './hei-calculator.service';
import { PIGCalculatorService } from './pig-calculator.service';
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
   * Calculate all indices (HPI, MI, WQI) for parsed CSV rows
   *
   * @param rows - Parsed CSV rows
   * @returns Array of calculation results per station
   */
  static calculateAllIndices(rows: ParsedCSVRow[]): StationCalculationResult[] {
    return rows.map((row) => {
      const result: StationCalculationResult = {
        station_id: row.station_id,
        latitude: row.latitude,
        longitude: row.longitude,
        state: row.state,
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

        // Calculate CDEG (uses same metals data)
        try {
          const cdegResult = CDEGCalculatorService.calculate(row.metals);
          if (cdegResult) {
            result.cdeg = cdegResult;
          } else {
            result.errors.push('CDEG: No valid heavy metals for calculation');
          }
        } catch (error) {
          result.errors.push(`CDEG calculation error: ${error}`);
        }

        // Calculate HEI (uses same metals data)
        try {
          const heiResult = HEICalculatorService.calculate(row.metals);
          if (heiResult) {
            result.hei = heiResult;
          } else {
            result.errors.push('HEI: No valid heavy metals for calculation');
          }
        } catch (error) {
          result.errors.push(`HEI calculation error: ${error}`);
        }

        // Calculate PIG (requires HPI and HEI)
        if (result.hpi && result.hei) {
          try {
            const pigResult = PIGCalculatorService.calculate(result.hpi.hpi, result.hei.hei);
            if (pigResult) {
              result.pig = pigResult;
            } else {
              result.errors.push('PIG: Unable to calculate from HPI and HEI');
            }
          } catch (error) {
            result.errors.push(`PIG calculation error: ${error}`);
          }
        }
      }

      // Calculate WQI (if WQI params available)
      if (Object.keys(row.wqiParams).length > 0) {
        try {
          const wqiResult = WQICalculatorService.calculate(row.wqiParams);
          if (wqiResult) {
            result.wqi = wqiResult;
          } else {
            result.errors.push('WQI: No valid parameters for calculation');
          }
        } catch (error) {
          result.errors.push(`WQI calculation error: ${error}`);
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
      if (!result.hpi && !result.mi && !result.wqi && !result.cdeg && !result.hei && !result.pig) {
        continue;
      }

      const input: NewCalculationInput = {
        upload_id: uploadId,
        station_id: result.station_id,
        latitude: result.latitude,
        longitude: result.longitude,
        state: result.state,
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

      // Add WQI data
      if (result.wqi) {
        input.wqi = result.wqi.wqi;
        input.wqi_classification = result.wqi.classification;
        input.wqi_params_analyzed = result.wqi.paramsAnalyzed;
      }

      // Add CDEG data
      if (result.cdeg) {
        input.cdeg = result.cdeg.cdeg;
        input.cdeg_classification = result.cdeg.classification;
      }

      // Add HEI data
      if (result.hei) {
        input.hei = result.hei.hei;
        input.hei_classification = result.hei.classification;
      }

      // Add PIG data
      if (result.pig) {
        input.pig = result.pig.pig;
        input.pig_classification = result.pig.classification;
      }

      // Save to database
      const [saved] = await db
        .insert(waterQualityCalculations)
        .values({
          upload_id: input.upload_id,
          station_id: input.station_id,
          latitude: input.latitude?.toString(),
          longitude: input.longitude?.toString(),
          state: input.state,
          city: input.city,
          hpi: input.hpi?.toString(),
          hpi_classification: input.hpi_classification,
          mi: input.mi?.toString(),
          mi_classification: input.mi_classification,
          mi_class: input.mi_class,
          wqi: input.wqi?.toString(),
          wqi_classification: input.wqi_classification,
          cdeg: input.cdeg?.toString(),
          cdeg_classification: input.cdeg_classification,
          hei: input.hei?.toString(),
          hei_classification: input.hei_classification,
          pig: input.pig?.toString(),
          pig_classification: input.pig_classification,
          metals_analyzed: input.metals_analyzed?.join(','),
          wqi_params_analyzed: input.wqi_params_analyzed?.join(','),
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
   * @param wqiParams - WQI parameter values
   * @param location - Optional location data
   * @returns StationCalculationResult
   */
  static calculateSingle(
    stationId: string,
    metals: Record<string, number>,
    wqiParams: Record<string, number>,
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

    // Calculate WQI
    if (Object.keys(wqiParams).length > 0) {
      const wqiResult = WQICalculatorService.calculate(wqiParams);
      if (wqiResult) {
        result.wqi = wqiResult;
      }
    }

    return result;
  }

  /**
   * Validate input data before calculation
   *
   * @param metals - Metal concentrations
   * @param wqiParams - WQI parameters
   * @returns Object containing all validation warnings
   */
  static validateInputData(
    metals: Record<string, number>,
    wqiParams: Record<string, number>
  ): {
    metalWarnings: string[];
    wqiWarnings: string[];
    isValid: boolean;
  } {
    const metalWarnings = [
      ...HPICalculatorService.validateMetals(metals),
      ...MICalculatorService.validateMetals(metals),
    ];
    const wqiWarnings = WQICalculatorService.validateParams(wqiParams);

    // Remove duplicates
    const uniqueMetalWarnings = [...new Set(metalWarnings)];

    return {
      metalWarnings: uniqueMetalWarnings,
      wqiWarnings,
      isValid:
        uniqueMetalWarnings.length === 0 && wqiWarnings.length === 0,
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
    wqiCount: number;
    hpiAvg: number | null;
    miAvg: number | null;
    wqiAvg: number | null;
    hpiByClassification: Record<string, number>;
    miByClassification: Record<string, number>;
    wqiByClassification: Record<string, number>;
  } {
    const hpiValues = calculations
      .filter((c) => c.hpi)
      .map((c) => c.hpi!.hpi);
    const miValues = calculations
      .filter((c) => c.mi)
      .map((c) => c.mi!.mi);
    const wqiValues = calculations
      .filter((c) => c.wqi)
      .map((c) => c.wqi!.wqi);

    const hpiByClassification: Record<string, number> = {};
    const miByClassification: Record<string, number> = {};
    const wqiByClassification: Record<string, number> = {};

    for (const calc of calculations) {
      if (calc.hpi) {
        hpiByClassification[calc.hpi.classification] =
          (hpiByClassification[calc.hpi.classification] || 0) + 1;
      }
      if (calc.mi) {
        miByClassification[calc.mi.classification] =
          (miByClassification[calc.mi.classification] || 0) + 1;
      }
      if (calc.wqi) {
        wqiByClassification[calc.wqi.classification] =
          (wqiByClassification[calc.wqi.classification] || 0) + 1;
      }
    }

    return {
      total: calculations.length,
      hpiCount: hpiValues.length,
      miCount: miValues.length,
      wqiCount: wqiValues.length,
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
      wqiAvg:
        wqiValues.length > 0
          ? Math.round(
              (wqiValues.reduce((a, b) => a + b, 0) / wqiValues.length) * 100
            ) / 100
          : null,
      hpiByClassification,
      miByClassification,
      wqiByClassification,
    };
  }
}
