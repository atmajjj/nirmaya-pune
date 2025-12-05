/**
 * HPI (Heavy Metal Pollution Index) Calculator Service
 *
 * Formula:
 * Wi = 1/Si (Weight of ith metal)
 * Qi = ((Mi - Ii) / (Si - Ii)) × 100 (Quality rating of ith metal)
 * HPI = Σ(Wi × Qi) / Σ(Wi)
 *
 * Where:
 * - Mi = Measured concentration of metal (ppb)
 * - Si = Standard permissible limit (ppb)
 * - Ii = Ideal value (ppb)
 *
 * Reference: BIS 10500:2012, WHO Guidelines
 */

import { METAL_STANDARDS, classifyHPI } from '../shared/constants';
import { HPIResult } from '../shared/interface';

/**
 * HPI Calculator Service
 * Calculates Heavy Metal Pollution Index based on metal concentrations
 */
export class HPICalculatorService {
  /**
   * Calculate HPI for a single station
   *
   * @param metals - Record of metal symbol to concentration in ppb
   * @param customStandards - Optional custom standards (defaults to BIS/WHO)
   * @returns HPIResult with HPI value, classification, and metals analyzed
   */
  static calculate(
    metals: Record<string, number>,
    customStandards?: Record<string, { Si: number; Ii: number }>
  ): HPIResult | null {
    const standards = customStandards || METAL_STANDARDS;
    const metalsAnalyzed: string[] = [];

    let sumWiQi = 0;
    let sumWi = 0;

    for (const [symbol, concentration] of Object.entries(metals)) {
      // Get standard for this metal
      const standard = standards[symbol];
      if (!standard) {
        // Skip metals without standards
        continue;
      }

      const Si = standard.Si;
      const Ii = standard.Ii;

      // Skip if Si equals Ii (would cause division by zero)
      if (Si === Ii) {
        continue;
      }

      // Calculate weight Wi = 1/Si
      const Wi = 1 / Si;

      // Calculate quality rating Qi = ((Mi - Ii) / (Si - Ii)) × 100
      // Using absolute value as per standard HPI formula
      const Qi = (Math.abs(concentration - Ii) / (Si - Ii)) * 100;

      sumWiQi += Wi * Qi;
      sumWi += Wi;
      metalsAnalyzed.push(symbol);
    }

    // Need at least one metal for calculation
    if (metalsAnalyzed.length === 0 || sumWi === 0) {
      return null;
    }

    // Calculate HPI = Σ(Wi × Qi) / Σ(Wi)
    const hpi = sumWiQi / sumWi;

    // Round to 2 decimal places
    const roundedHPI = Math.round(hpi * 100) / 100;

    return {
      hpi: roundedHPI,
      classification: classifyHPI(roundedHPI),
      metalsAnalyzed,
    };
  }

  /**
   * Calculate HPI for multiple stations (batch)
   *
   * @param stationsData - Array of station data with metals
   * @returns Array of HPIResult or null for each station
   */
  static calculateBatch(
    stationsData: Array<{
      station_id: string;
      metals: Record<string, number>;
    }>
  ): Array<{ station_id: string; result: HPIResult | null }> {
    return stationsData.map(({ station_id, metals }) => ({
      station_id,
      result: this.calculate(metals),
    }));
  }

  /**
   * Validate metal concentrations
   * Returns warnings for suspicious values
   *
   * @param metals - Record of metal symbol to concentration in ppb
   * @returns Array of warning messages
   */
  static validateMetals(metals: Record<string, number>): string[] {
    const warnings: string[] = [];

    for (const [symbol, concentration] of Object.entries(metals)) {
      // Check for negative values
      if (concentration < 0) {
        warnings.push(`${symbol}: Negative concentration (${concentration} ppb) detected`);
      }

      // Check for extremely high values (10x above standard)
      const standard = METAL_STANDARDS[symbol];
      if (standard && concentration > standard.Si * 10) {
        warnings.push(
          `${symbol}: Very high concentration (${concentration} ppb) - ` +
            `${Math.round((concentration / standard.Si) * 100) / 100}x above standard`
        );
      }
    }

    return warnings;
  }

  /**
   * Get individual metal quality ratings for detailed analysis
   *
   * @param metals - Record of metal symbol to concentration in ppb
   * @returns Array of detailed metal analysis
   */
  static getDetailedAnalysis(metals: Record<string, number>): Array<{
    symbol: string;
    name: string;
    concentration: number;
    Si: number;
    Ii: number;
    Wi: number;
    Qi: number;
    contribution: number;
  }> {
    const analysis: Array<{
      symbol: string;
      name: string;
      concentration: number;
      Si: number;
      Ii: number;
      Wi: number;
      Qi: number;
      contribution: number;
    }> = [];

    let totalWi = 0;

    // First pass: calculate total weight
    for (const [symbol] of Object.entries(metals)) {
      const standard = METAL_STANDARDS[symbol];
      if (!standard || standard.Si === standard.Ii) continue;
      totalWi += 1 / standard.Si;
    }

    // Second pass: calculate individual contributions
    for (const [symbol, concentration] of Object.entries(metals)) {
      const standard = METAL_STANDARDS[symbol];
      if (!standard || standard.Si === standard.Ii) continue;

      const Wi = 1 / standard.Si;
      const Qi = (Math.abs(concentration - standard.Ii) / (standard.Si - standard.Ii)) * 100;

      analysis.push({
        symbol,
        name: standard.name,
        concentration,
        Si: standard.Si,
        Ii: standard.Ii,
        Wi: Math.round(Wi * 10000) / 10000,
        Qi: Math.round(Qi * 100) / 100,
        contribution: totalWi > 0 ? Math.round(((Wi * Qi) / totalWi) * 100) / 100 : 0,
      });
    }

    // Sort by contribution (descending)
    return analysis.sort((a, b) => b.contribution - a.contribution);
  }
}
