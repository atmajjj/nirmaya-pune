/**
 * MI (Metal Index) Calculator Service
 *
 * Formula:
 * MI = Σ (Ci / MACi)
 *
 * Where:
 * - Ci = Measured concentration of metal (ppb)
 * - MACi = Maximum Allowable Concentration (ppb)
 *
 * Classification (Tamasi and Cini, 1976):
 * - MI < 0.3: Class I - Very Pure
 * - MI 0.3-1.0: Class II - Pure
 * - MI 1.0-2.0: Class III - Slightly Affected
 * - MI 2.0-4.0: Class IV - Moderately Affected
 * - MI 4.0-6.0: Class V - Strongly Affected
 * - MI ≥ 6.0: Class VI - Seriously Affected
 *
 * Reference: BIS 10500:2012, WHO Guidelines
 */

import { METAL_STANDARDS, classifyMI } from '../shared/constants';
import { MIResult } from '../shared/interface';

/**
 * MI Calculator Service
 * Calculates Metal Index based on metal concentrations and MAC values
 */
export class MICalculatorService {
  /**
   * Calculate MI for a single station
   *
   * @param metals - Record of metal symbol to concentration in ppb
   * @param customMAC - Optional custom MAC values (defaults to BIS/WHO)
   * @returns MIResult with MI value, classification, class, and metals analyzed
   */
  static calculate(
    metals: Record<string, number>,
    customMAC?: Record<string, number>
  ): MIResult | null {
    const metalsAnalyzed: string[] = [];
    let mi = 0;

    for (const [symbol, concentration] of Object.entries(metals)) {
      // Get MAC for this metal
      let mac: number | undefined;

      if (customMAC && customMAC[symbol] !== undefined) {
        mac = customMAC[symbol];
      } else if (METAL_STANDARDS[symbol]) {
        mac = METAL_STANDARDS[symbol].MAC;
      }

      // Skip metals without MAC values
      if (!mac || mac === 0) {
        continue;
      }

      // Calculate contribution: Ci / MACi
      mi += concentration / mac;
      metalsAnalyzed.push(symbol);
    }

    // Need at least one metal for calculation
    if (metalsAnalyzed.length === 0) {
      return null;
    }

    // Round to 4 decimal places for precision
    const roundedMI = Math.round(mi * 10000) / 10000;

    const { classification, miClass } = classifyMI(roundedMI);

    return {
      mi: roundedMI,
      classification,
      miClass,
      metalsAnalyzed,
    };
  }

  /**
   * Calculate MI for multiple stations (batch)
   *
   * @param stationsData - Array of station data with metals
   * @returns Array of MIResult or null for each station
   */
  static calculateBatch(
    stationsData: Array<{
      station_id: string;
      metals: Record<string, number>;
    }>
  ): Array<{ station_id: string; result: MIResult | null }> {
    return stationsData.map(({ station_id, metals }) => ({
      station_id,
      result: this.calculate(metals),
    }));
  }

  /**
   * Validate metal concentrations for MI calculation
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

      // Check for values exceeding MAC (concerning)
      const standard = METAL_STANDARDS[symbol];
      if (standard && concentration > standard.MAC) {
        const exceedance = Math.round((concentration / standard.MAC) * 100) / 100;
        warnings.push(
          `${symbol}: Exceeds MAC (${concentration} ppb vs ${standard.MAC} ppb MAC) - ${exceedance}x`
        );
      }
    }

    return warnings;
  }

  /**
   * Get individual metal contributions for detailed analysis
   *
   * @param metals - Record of metal symbol to concentration in ppb
   * @returns Array of detailed metal analysis sorted by contribution
   */
  static getDetailedAnalysis(metals: Record<string, number>): Array<{
    symbol: string;
    name: string;
    concentration: number;
    MAC: number;
    ratio: number;
    percentOfTotal: number;
  }> {
    const analysis: Array<{
      symbol: string;
      name: string;
      concentration: number;
      MAC: number;
      ratio: number;
      percentOfTotal: number;
    }> = [];

    let totalMI = 0;

    // First pass: calculate total MI
    for (const [symbol, concentration] of Object.entries(metals)) {
      const standard = METAL_STANDARDS[symbol];
      if (!standard || standard.MAC === 0) continue;
      totalMI += concentration / standard.MAC;
    }

    // Second pass: calculate individual contributions
    for (const [symbol, concentration] of Object.entries(metals)) {
      const standard = METAL_STANDARDS[symbol];
      if (!standard || standard.MAC === 0) continue;

      const ratio = concentration / standard.MAC;
      const percentOfTotal = totalMI > 0 ? (ratio / totalMI) * 100 : 0;

      analysis.push({
        symbol,
        name: standard.name,
        concentration,
        MAC: standard.MAC,
        ratio: Math.round(ratio * 10000) / 10000,
        percentOfTotal: Math.round(percentOfTotal * 100) / 100,
      });
    }

    // Sort by ratio (descending) - highest contributors first
    return analysis.sort((a, b) => b.ratio - a.ratio);
  }

  /**
   * Get threshold comparison for all metals
   * Useful for identifying which metals are above/below MAC
   *
   * @param metals - Record of metal symbol to concentration in ppb
   * @returns Categorized metals by status
   */
  static getThresholdComparison(metals: Record<string, number>): {
    safe: Array<{ symbol: string; concentration: number; MAC: number; ratio: number }>;
    warning: Array<{ symbol: string; concentration: number; MAC: number; ratio: number }>;
    exceeded: Array<{ symbol: string; concentration: number; MAC: number; ratio: number }>;
  } {
    const result: {
      safe: Array<{ symbol: string; concentration: number; MAC: number; ratio: number }>;
      warning: Array<{ symbol: string; concentration: number; MAC: number; ratio: number }>;
      exceeded: Array<{ symbol: string; concentration: number; MAC: number; ratio: number }>;
    } = {
      safe: [], // ratio < 0.5 (less than 50% of MAC)
      warning: [], // ratio 0.5-1.0 (50-100% of MAC)
      exceeded: [], // ratio > 1.0 (above MAC)
    };

    for (const [symbol, concentration] of Object.entries(metals)) {
      const standard = METAL_STANDARDS[symbol];
      if (!standard || standard.MAC === 0) continue;

      const ratio = concentration / standard.MAC;
      const entry = {
        symbol,
        concentration,
        MAC: standard.MAC,
        ratio: Math.round(ratio * 10000) / 10000,
      };

      if (ratio < 0.5) {
        result.safe.push(entry);
      } else if (ratio <= 1.0) {
        result.warning.push(entry);
      } else {
        result.exceeded.push(entry);
      }
    }

    // Sort each category by ratio (descending)
    result.safe.sort((a, b) => b.ratio - a.ratio);
    result.warning.sort((a, b) => b.ratio - a.ratio);
    result.exceeded.sort((a, b) => b.ratio - a.ratio);

    return result;
  }
}
