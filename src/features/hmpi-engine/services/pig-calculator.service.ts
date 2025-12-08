/**
 * PIG (Pollution Index of Groundwater) Calculator Service
 *
 * Formula:
 * PIG = √[(HPI/100)² + (HEI)²] / √2
 *
 * Where:
 * - HPI = Heavy Metal Pollution Index
 * - HEI = Heavy Metal Evaluation Index
 *
 * Interpretation:
 * - PIG < 1: Low pollution
 * - PIG 1-2: Moderate pollution
 * - PIG 2-5: High pollution
 * - PIG > 5: Very high pollution
 *
 * Reference: Composite pollution index assessment methods
 */

import { PIGResult } from '../shared/interface';

/**
 * PIG Calculator Service
 * Calculates Pollution Index of Groundwater by combining HPI and HEI
 */
export class PIGCalculatorService {
  /**
   * Calculate PIG for a single station
   *
   * @param hpi - Heavy Metal Pollution Index value
   * @param hei - Heavy Metal Evaluation Index value
   * @returns PIGResult with PIG value and classification
   */
  static calculate(hpi: number | null | undefined, hei: number | null | undefined): PIGResult | null {
    // Validate inputs
    if (hpi === null || hpi === undefined || hei === null || hei === undefined) {
      return null;
    }

    try {
      // Normalize HPI to 0-1 range by dividing by 100
      const hpiNormalized = hpi / 100;

      // Calculate PIG: √[(HPI/100)² + (HEI)²] / √2
      const pig = Math.sqrt(Math.pow(hpiNormalized, 2) + Math.pow(hei, 2)) / Math.sqrt(2);

      // Round to 4 decimal places
      const roundedPIG = Math.round(pig * 10000) / 10000;

      return {
        pig: roundedPIG,
        classification: this.classifyPIG(roundedPIG),
        hpi_used: hpi,
        hei_used: hei,
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Classify PIG value into pollution categories
   *
   * @param pig - Calculated PIG value
   * @returns Classification string
   */
  private static classifyPIG(pig: number): string {
    if (pig < 1) {
      return 'Low pollution';
    } else if (pig < 2) {
      return 'Moderate pollution';
    } else if (pig < 5) {
      return 'High pollution';
    } else {
      return 'Very high pollution';
    }
  }

  /**
   * Calculate PIG for multiple stations (batch)
   *
   * @param stationsData - Array of station data with HPI and HEI values
   * @returns Array of PIGResult or null for each station
   */
  static calculateBatch(
    stationsData: Array<{
      station_id: string;
      hpi: number | null;
      hei: number | null;
    }>
  ): Array<{ station_id: string; result: PIGResult | null }> {
    return stationsData.map(({ station_id, hpi, hei }) => ({
      station_id,
      result: this.calculate(hpi, hei),
    }));
  }
}
