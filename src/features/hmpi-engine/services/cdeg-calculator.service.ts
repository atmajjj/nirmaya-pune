/**
 * CDEG (Degree of Contamination) Calculator Service
 *
 * Formula:
 * Cdeg = Σ(Cfi)
 * Cfi = (Vi / Si) - 1 (Contamination factor)
 *
 * Where:
 * - Vi = Observed value (ppb)
 * - Si = Standard permissible limit (ppb)
 * - Cfi = Contamination factor for metal i
 *
 * Interpretation:
 * - Cdeg < 1: Low contamination
 * - Cdeg 1-3: Medium contamination
 * - Cdeg > 3: High contamination
 *
 * Reference: Based on degree of contamination assessment methods
 */

import { METAL_STANDARDS } from '../shared/constants';
import { CDEGResult } from '../shared/interface';

/**
 * CDEG Calculator Service
 * Calculates Degree of Contamination based on heavy metal concentrations
 */
export class CDEGCalculatorService {
  /**
   * Calculate CDEG for a single station
   *
   * @param metals - Record of metal symbol to concentration in ppb
   * @param customStandards - Optional custom standards (defaults to BIS/WHO)
   * @returns CDEGResult with CDEG value, classification, and metals analyzed
   */
  static calculate(
    metals: Record<string, number>,
    customStandards?: Record<string, { Si: number; Ii: number }>
  ): CDEGResult | null {
    const standards = customStandards || METAL_STANDARDS;
    const metalsAnalyzed: string[] = [];

    let cdeg = 0;

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

      // Calculate contamination factor: Cfi = (Vi / Si) - 1
      const Cfi = (concentration / Si) - 1;

      // Add to cumulative CDEG
      cdeg += Cfi;
      metalsAnalyzed.push(symbol);
    }

    // Need at least one heavy metal for calculation
    if (metalsAnalyzed.length === 0) {
      return null;
    }

    // Round to 4 decimal places
    const roundedCDEG = Math.round(cdeg * 10000) / 10000;

    return {
      cdeg: roundedCDEG,
      classification: this.classifyCDEG(roundedCDEG),
      metalsAnalyzed,
    };
  }

  /**
   * Classify CDEG value into contamination categories
   *
   * @param cdeg - Calculated CDEG value
   * @returns Classification string
   */
  private static classifyCDEG(cdeg: number): string {
    if (cdeg < 1) {
      return 'Low contamination';
    } else if (cdeg < 3) {
      return 'Medium contamination';
    } else {
      return 'High contamination';
    }
  }

  /**
   * Calculate CDEG for multiple stations (batch)
   *
   * @param stationsData - Array of station data with metals
   * @returns Array of CDEGResult or null for each station
   */
  static calculateBatch(
    stationsData: Array<{
      station_id: string;
      metals: Record<string, number>;
    }>
  ): Array<{ station_id: string; result: CDEGResult | null }> {
    return stationsData.map(({ station_id, metals }) => ({
      station_id,
      result: this.calculate(metals),
    }));
  }
}
