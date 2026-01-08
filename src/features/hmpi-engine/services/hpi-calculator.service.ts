/**
 * HPI (Heavy Metal Pollution Index) Calculator Service
 * 
 * EXACT implementation from Flutter reference code
 *
 * Formula (EXACT):
 * 1. Wi = 1 / Si                               (Unit weight)
 * 2. Di = |Mi - Ii|                            (Absolute difference)
 * 3. Qi = (Di / (Si - Ii)) × 100              (Sub-index)
 * 4. WiQi = Wi × Qi                           (Contribution)
 * 5. HPI = Σ(WiQi) / Σ(Wi)                   (Final index)
 *
 * Where:
 * - Mi = Measured concentration (ppb/µg/L)
 * - Si = Standard permissible limit (ppb)
 * - Ii = Ideal value (ppb)
 *
 * Reference: BIS 10500:2012, WHO Guidelines
 * Test Case: As=0.048, Cu=2.54, Zn=43.89, Hg=2.83, Cd=0.06, Ni=0.095, Pb=0.215
 * Expected HPI: 146.33519
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
   * EXACT Flutter implementation
   *
   * @param metals - Record of metal symbol to concentration in ppb
   * @param customStandards - Optional custom standards (defaults to BIS/WHO)
   * @returns HPIResult with HPI value, classification, and detailed breakdown
   */
  static calculate(
    metals: Record<string, number>,
    customStandards?: Record<string, { Si: number; Ii: number }>
  ): HPIResult | null {
    const standards = customStandards || METAL_STANDARDS;

    let sumWi = 0;
    let sumWiQi = 0;
    const metalsAnalyzed: string[] = [];
    const subIndices: Record<string, number> = {};
    const unitWeights: Record<string, number> = {};
    const contributions: Record<string, number> = {};

    for (const [symbol, Mi] of Object.entries(metals)) {
      const standard = standards[symbol];
      if (!standard) {
        // Skip metals without standards
        continue;
      }

      const { Si, Ii } = standard;

      // Skip if Si <= Ii (validation)
      if (Si <= Ii) {
        console.warn(`Skipping ${symbol}: Si (${Si}) must be > Ii (${Ii})`);
        continue;
      }

      // Calculate Wi = 1 / Si (weighted by standard - original HPI formula)
      const Wi = 1.0 / Si;

      // Calculate Qi = (|Mi - Ii| / (Si - Ii)) × 100
      const Di = Math.abs(Mi - Ii);
      const Qi = (Di / (Si - Ii)) * 100.0;

      // Calculate WiQi = Wi × Qi
      const WiQi = Wi * Qi;

      sumWi += Wi;
      sumWiQi += WiQi;
      metalsAnalyzed.push(symbol);

      // Store breakdown for transparency
      unitWeights[symbol] = Wi;
      subIndices[symbol] = Qi;
      contributions[symbol] = WiQi;
    }

    // Need at least one metal for calculation
    if (metalsAnalyzed.length === 0 || sumWi === 0) {
      return null;
    }

    // Calculate HPI = Σ(WiQi) / Σ(Wi)
    const hpi = sumWiQi / sumWi;

    // Round to 2 decimal places
    const roundedHPI = Math.round(hpi * 100) / 100;

    return {
      hpi: roundedHPI,
      classification: classifyHPI(roundedHPI),
      metalsAnalyzed,
      subIndices,
      unitWeights,
      contributions,
      sumWi,
      sumWiQi,
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
   * Uses EXACT Flutter formulas
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

    // First pass: calculate total weight using EXACT Flutter formula
    for (const [symbol] of Object.entries(metals)) {
      const standard = METAL_STANDARDS[symbol];
      if (!standard || standard.Si <= standard.Ii) continue;
      totalWi += 1.0 / standard.Si; // Wi = 1 / Si
    }

    // Second pass: calculate individual contributions
    for (const [symbol, Mi] of Object.entries(metals)) {
      const standard = METAL_STANDARDS[symbol];
      if (!standard || standard.Si <= standard.Ii) continue;

      const { Si, Ii } = standard;

      // Wi = 1 / Si (EXACT Flutter formula)
      const Wi = 1.0 / Si;

      // Qi = (|Mi - Ii| / (Si - Ii)) × 100 (EXACT Flutter formula)
      const Di = Math.abs(Mi - Ii);
      const Qi = (Di / (Si - Ii)) * 100.0;

      analysis.push({
        symbol,
        name: standard.name,
        concentration: Mi,
        Si,
        Ii,
        Wi: Math.round(Wi * 10000) / 10000,
        Qi: Math.round(Qi * 100) / 100,
        contribution: totalWi > 0 ? Math.round(((Wi * Qi) / totalWi) * 100) / 100 : 0,
      });
    }

    // Sort by contribution (descending)
    return analysis.sort((a, b) => b.contribution - a.contribution);
  }
}
