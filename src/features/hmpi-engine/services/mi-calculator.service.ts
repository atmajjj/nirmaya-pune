/**
 * MI (Metal Index) Calculator Service
 * 
 * EXACT implementation from Flutter reference code
 * 
 * ============================================================================
 * FORMULA (Caeiro et al., 2005)
 * ============================================================================
 * 
 * For each metal:
 *     ratio_i = Ci / MACi
 * 
 * Metal Index (MI):
 *     MI = Σ (Ci / MACi)  for i = 1...n
 * 
 * Where:
 *   - Ci = Mean concentration of metal i in ppb (µg/L)
 *   - MACi = Maximum Allowable Concentration of metal i in ppb (µg/L)
 *   - MI is dimensionless
 * 
 * ============================================================================
 * MI CLASSIFICATION (Caeiro et al., 2005)
 * ============================================================================
 * 
 * Class I   → Very Pure            → MI < 0.3
 * Class II  → Pure                 → 0.3 ≤ MI < 1
 * Class III → Slightly Affected    → 1 ≤ MI < 2
 * Class IV  → Moderately Affected  → 2 ≤ MI < 4
 * Class V   → Strongly Affected    → 4 ≤ MI < 6
 * Class VI  → Seriously Affected   → MI ≥ 6
 * 
 * Test Case: As=269.58, Cd=6.22, Cu=554.98, Pb=10.59, Hg=0.17, Ni=61.83, Zn=2587.05
 *           MAC: As=50, Cd=3, Cu=1500, Pb=10, Hg=1, Ni=20, Zn=15000
 * Expected MI: 12.3292525
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
   * EXACT Flutter formula:
   * - For each metal: ratio_i = Ci / MACi
   * - MI = Σ(ratio_i)
   *
   * @param metals - Record of metal symbol to concentration in ppb (Ci values)
   * @param customMAC - Optional custom MAC values (defaults to BIS/WHO)
   * @returns MIResult with MI value, classification, class, and detailed breakdown
   */
  static calculate(
    metals: Record<string, number>,
    customMAC?: Record<string, number>
  ): MIResult | null {
    const metalsAnalyzed: string[] = [];
    const ratios: Record<string, number> = {};
    const concentrations: Record<string, number> = {};
    const macValues: Record<string, number> = {};
    let miSum = 0.0;

    // Calculate MI = Σ(Ci / MACi)
    for (const [symbol, Ci] of Object.entries(metals)) {
      // Get MACi for this metal
      let MACi: number | undefined;

      if (customMAC && customMAC[symbol] !== undefined) {
        MACi = customMAC[symbol];
      } else if (METAL_STANDARDS[symbol]) {
        MACi = METAL_STANDARDS[symbol].MAC;
      }

      // Validate MACi (must be > 0)
      if (!MACi || MACi <= 0) {
        continue; // Skip metals without valid MAC values
      }

      // EXACT Flutter formula: ratio = Ci / MACi
      const ratio = Ci / MACi;

      // Accumulate sum
      miSum += ratio;

      // Store for breakdown
      metalsAnalyzed.push(symbol);
      ratios[symbol] = ratio;
      concentrations[symbol] = Ci;
      macValues[symbol] = MACi;
    }

    // Need at least one metal for calculation
    if (metalsAnalyzed.length === 0) {
      return null;
    }

    // MI is the sum (no averaging or weighting)
    const mi = miSum;

    const { classification, miClass } = classifyMI(mi);

    return {
      mi,
      classification,
      miClass,
      metalsAnalyzed,
      ratios,
      concentrations,
      macValues,
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
   * EXACT Flutter formula: ratio = Ci / MACi
   *
   * @param metals - Record of metal symbol to concentration in ppb (Ci values)
   * @returns Array of detailed metal analysis sorted by contribution
   */
  static getDetailedAnalysis(metals: Record<string, number>): Array<{
    symbol: string;
    name: string;
    Ci: number;          // Concentration in ppb
    MACi: number;        // Maximum Allowable Concentration in ppb
    ratio: number;       // Ci / MACi
    percentOfTotal: number;
  }> {
    const analysis: Array<{
      symbol: string;
      name: string;
      Ci: number;
      MACi: number;
      ratio: number;
      percentOfTotal: number;
    }> = [];

    let miSum = 0.0;

    // First pass: calculate total MI = Σ(Ci / MACi)
    for (const [symbol, Ci] of Object.entries(metals)) {
      const standard = METAL_STANDARDS[symbol];
      if (!standard || standard.MAC <= 0) continue;
      
      const MACi = standard.MAC;
      const ratio = Ci / MACi;
      miSum += ratio;
    }

    // Second pass: calculate individual contributions with percentages
    for (const [symbol, Ci] of Object.entries(metals)) {
      const standard = METAL_STANDARDS[symbol];
      if (!standard || standard.MAC <= 0) continue;

      const MACi = standard.MAC;
      const ratio = Ci / MACi;  // EXACT Flutter formula
      const percentOfTotal = miSum > 0 ? (ratio / miSum) * 100 : 0;

      analysis.push({
        symbol,
        name: standard.name,
        Ci,
        MACi,
        ratio,
        percentOfTotal,
      });
    }

    // Sort by ratio (descending) - highest contributors first
    return analysis.sort((a, b) => b.ratio - a.ratio);
  }

  /**
   * Get threshold comparison for all metals
   * Useful for identifying which metals are above/below MAC
   * 
   * Formula: ratio = Ci / MACi
   *
   * @param metals - Record of metal symbol to concentration in ppb (Ci values)
   * @returns Categorized metals by status (safe/warning/exceeded)
   */
  static getThresholdComparison(metals: Record<string, number>): {
    safe: Array<{ symbol: string; Ci: number; MACi: number; ratio: number }>;
    warning: Array<{ symbol: string; Ci: number; MACi: number; ratio: number }>;
    exceeded: Array<{ symbol: string; Ci: number; MACi: number; ratio: number }>;
  } {
    const result: {
      safe: Array<{ symbol: string; Ci: number; MACi: number; ratio: number }>;
      warning: Array<{ symbol: string; Ci: number; MACi: number; ratio: number }>;
      exceeded: Array<{ symbol: string; Ci: number; MACi: number; ratio: number }>;
    } = {
      safe: [],     // ratio < 0.5 (less than 50% of MAC)
      warning: [],  // ratio 0.5-1.0 (50-100% of MAC)
      exceeded: [], // ratio > 1.0 (above MAC)
    };

    for (const [symbol, Ci] of Object.entries(metals)) {
      const standard = METAL_STANDARDS[symbol];
      if (!standard || standard.MAC <= 0) continue;

      const MACi = standard.MAC;
      const ratio = Ci / MACi;  // EXACT Flutter formula
      
      const entry = {
        symbol,
        Ci,
        MACi,
        ratio,
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
