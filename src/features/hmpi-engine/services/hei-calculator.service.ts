/**
 * HEI (Heavy Metal Evaluation Index) Calculator Service
 *
 * Formula:
 * HEI = Σ(Vi / Si)
 *
 * Where:
 * - Vi = Observed value (ppb)
 * - Si = Standard permissible limit (ppb)
 *
 * Interpretation:
 * - HEI < 10: Low contamination
 * - HEI 10-20: Medium contamination
 * - HEI > 20: High contamination
 *
 * Reference: Heavy metal evaluation assessment methods
 */

import { METAL_STANDARDS } from '../shared/constants';
import { HEIResult } from '../shared/interface';

/**
 * HEI Calculator Service
 * Calculates Heavy Metal Evaluation Index based on heavy metal concentrations
 */
export class HEICalculatorService {
  /**
   * Calculate HEI for a single station
   *
   * @param metals - Record of metal symbol to concentration in ppb
   * @param customStandards - Optional custom standards (defaults to BIS/WHO)
   * @returns HEIResult with HEI value, classification, and metals analyzed
   */
  static calculate(
    metals: Record<string, number>,
    customStandards?: Record<string, { Si: number; Ii: number }>
  ): HEIResult | null {
    const standards = customStandards || METAL_STANDARDS;
    const metalsAnalyzed: string[] = [];

    let hei = 0;

    // Filter for heavy metals only (based on BIS standards categories)
    const heavyMetals = ['Hg', 'Cd', 'As', 'Pb', 'Se', 'Ni', 'Cr'];

    for (const [symbol, concentration] of Object.entries(metals)) {
      // Only process heavy metals
      if (!heavyMetals.includes(symbol)) {
        continue;
      }

      // Get standard for this metal
      const standard = standards[symbol];
      if (!standard) {
        // Skip metals without standards
        continue;
      }

      const Si = standard.Si;

      // Skip if Si is zero (would cause division by zero)
      if (Si === 0) {
        continue;
      }

      // Add ratio to HEI: Vi / Si
      hei += concentration / Si;
      metalsAnalyzed.push(symbol);
    }

    // Need at least one heavy metal for calculation
    if (metalsAnalyzed.length === 0) {
      return null;
    }

    // Round to 4 decimal places
    const roundedHEI = Math.round(hei * 10000) / 10000;

    return {
      hei: roundedHEI,
      classification: this.classifyHEI(roundedHEI),
      metalsAnalyzed,
    };
  }

  /**
   * Classify HEI value into contamination categories
   *
   * @param hei - Calculated HEI value
   * @returns Classification string
   */
  private static classifyHEI(hei: number): string {
    if (hei < 10) {
      return 'Low contamination';
    } else if (hei < 20) {
      return 'Medium contamination';
    } else {
      return 'High contamination';
    }
  }

  /**
   * Calculate HEI for multiple stations (batch)
   *
   * @param stationsData - Array of station data with metals
   * @returns Array of HEIResult or null for each station
   */
  static calculateBatch(
    stationsData: Array<{
      station_id: string;
      metals: Record<string, number>;
    }>
  ): Array<{ station_id: string; result: HEIResult | null }> {
    return stationsData.map(({ station_id, metals }) => ({
      station_id,
      result: this.calculate(metals),
    }));
  }
}
