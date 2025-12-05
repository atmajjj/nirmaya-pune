/**
 * WQI (Water Quality Index) Calculator Service
 *
 * Formula (Weighted Arithmetic Method):
 * K = 1 / Σ(1/Sn) (Proportionality constant)
 * Wi = K / Sn (Relative weight of each parameter)
 * Qi = ((Vn - Vo) / (Sn - Vo)) × 100 (Quality rating)
 * WQI = Σ(Wi × Qi)
 *
 * Where:
 * - Vn = Measured value of parameter
 * - Sn = Standard (permissible limit)
 * - Vo = Ideal value
 *
 * Classification:
 * - WQI 0-25: Excellent
 * - WQI 26-50: Good
 * - WQI 51-75: Poor
 * - WQI 76-100: Very Poor
 * - WQI > 100: Unfit for consumption
 *
 * Reference: BIS 10500:2012
 */

import { WQI_STANDARDS, classifyWQI } from '../shared/constants';
import { WQIResult } from '../shared/interface';

/**
 * WQI Calculator Service
 * Calculates Water Quality Index based on various water quality parameters
 */
export class WQICalculatorService {
  /**
   * Calculate WQI for a single station
   *
   * @param params - Record of parameter symbol to measured value
   * @param customStandards - Optional custom standards (defaults to BIS)
   * @returns WQIResult with WQI value, classification, and parameters analyzed
   */
  static calculate(
    params: Record<string, number>,
    customStandards?: Record<string, { Sn: number; Vo: number }>
  ): WQIResult | null {
    const standards = customStandards || WQI_STANDARDS;
    const paramsAnalyzed: string[] = [];

    // First pass: calculate K (proportionality constant)
    // K = 1 / Σ(1/Sn)
    let sumInverseSn = 0;
    const validParams: Array<{ symbol: string; Vn: number; Sn: number; Vo: number }> = [];

    for (const [symbol, value] of Object.entries(params)) {
      const standard = standards[symbol];
      if (!standard) continue;

      const Sn = standard.Sn;
      const Vo = standard.Vo;

      // Skip parameters with invalid standards
      if (Sn === 0 || Sn === Vo) continue;

      sumInverseSn += 1 / Sn;
      validParams.push({ symbol, Vn: value, Sn, Vo });
      paramsAnalyzed.push(symbol);
    }

    // Need at least one parameter for calculation
    if (validParams.length === 0 || sumInverseSn === 0) {
      return null;
    }

    // Calculate K
    const K = 1 / sumInverseSn;

    // Second pass: calculate WQI = Σ(Wi × Qi)
    let wqi = 0;

    for (const { Vn, Sn, Vo } of validParams) {
      // Wi = K / Sn (relative weight)
      const Wi = K / Sn;

      // Qi = ((Vn - Vo) / (Sn - Vo)) × 100 (quality rating)
      const Qi = ((Vn - Vo) / (Sn - Vo)) * 100;

      wqi += Wi * Qi;
    }

    // Round to 2 decimal places
    const roundedWQI = Math.round(wqi * 100) / 100;

    return {
      wqi: roundedWQI,
      classification: classifyWQI(roundedWQI),
      paramsAnalyzed,
    };
  }

  /**
   * Calculate WQI for multiple stations (batch)
   *
   * @param stationsData - Array of station data with WQI parameters
   * @returns Array of WQIResult or null for each station
   */
  static calculateBatch(
    stationsData: Array<{
      station_id: string;
      params: Record<string, number>;
    }>
  ): Array<{ station_id: string; result: WQIResult | null }> {
    return stationsData.map(({ station_id, params }) => ({
      station_id,
      result: this.calculate(params),
    }));
  }

  /**
   * Validate WQI parameters
   * Returns warnings for suspicious or out-of-range values
   *
   * @param params - Record of parameter symbol to measured value
   * @returns Array of warning messages
   */
  static validateParams(params: Record<string, number>): string[] {
    const warnings: string[] = [];

    for (const [symbol, value] of Object.entries(params)) {
      const standard = WQI_STANDARDS[symbol];

      // Check for negative values (except pH which should be 0-14)
      if (value < 0 && symbol !== 'pH') {
        warnings.push(`${symbol}: Negative value (${value}) detected`);
      }

      // pH specific validation
      if (symbol === 'pH') {
        if (value < 0 || value > 14) {
          warnings.push(`pH: Value (${value}) outside valid range (0-14)`);
        }
      }

      // Check for values significantly exceeding standard
      if (standard && value > standard.Sn * 5) {
        warnings.push(
          `${symbol}: Very high value (${value}) - ` +
            `${Math.round((value / standard.Sn) * 100) / 100}x above standard`
        );
      }
    }

    return warnings;
  }

  /**
   * Get individual parameter contributions for detailed analysis
   *
   * @param params - Record of parameter symbol to measured value
   * @returns Array of detailed parameter analysis sorted by contribution
   */
  static getDetailedAnalysis(params: Record<string, number>): Array<{
    symbol: string;
    name: string;
    unit: string;
    value: number;
    Sn: number;
    Vo: number;
    Wi: number;
    Qi: number;
    WiQi: number;
    percentOfTotal: number;
  }> {
    const analysis: Array<{
      symbol: string;
      name: string;
      unit: string;
      value: number;
      Sn: number;
      Vo: number;
      Wi: number;
      Qi: number;
      WiQi: number;
      percentOfTotal: number;
    }> = [];

    // Calculate K first
    let sumInverseSn = 0;
    for (const [symbol] of Object.entries(params)) {
      const standard = WQI_STANDARDS[symbol];
      if (!standard || standard.Sn === 0 || standard.Sn === standard.Vo) continue;
      sumInverseSn += 1 / standard.Sn;
    }

    if (sumInverseSn === 0) return analysis;

    const K = 1 / sumInverseSn;

    // Calculate total WQI for percentage calculation
    let totalWQI = 0;
    const contributions: Array<{
      symbol: string;
      WiQi: number;
    }> = [];

    for (const [symbol, value] of Object.entries(params)) {
      const standard = WQI_STANDARDS[symbol];
      if (!standard || standard.Sn === 0 || standard.Sn === standard.Vo) continue;

      const Wi = K / standard.Sn;
      const Qi = ((value - standard.Vo) / (standard.Sn - standard.Vo)) * 100;
      const WiQi = Wi * Qi;

      totalWQI += WiQi;
      contributions.push({ symbol, WiQi });
    }

    // Build detailed analysis
    for (const [symbol, value] of Object.entries(params)) {
      const standard = WQI_STANDARDS[symbol];
      if (!standard || standard.Sn === 0 || standard.Sn === standard.Vo) continue;

      const Wi = K / standard.Sn;
      const Qi = ((value - standard.Vo) / (standard.Sn - standard.Vo)) * 100;
      const WiQi = Wi * Qi;
      const percentOfTotal = totalWQI !== 0 ? (WiQi / totalWQI) * 100 : 0;

      analysis.push({
        symbol,
        name: standard.name,
        unit: standard.unit,
        value,
        Sn: standard.Sn,
        Vo: standard.Vo,
        Wi: Math.round(Wi * 10000) / 10000,
        Qi: Math.round(Qi * 100) / 100,
        WiQi: Math.round(WiQi * 100) / 100,
        percentOfTotal: Math.round(percentOfTotal * 100) / 100,
      });
    }

    // Sort by contribution (descending)
    return analysis.sort((a, b) => b.WiQi - a.WiQi);
  }

  /**
   * Get parameter status relative to standards
   * Categorizes parameters as within limits, approaching limits, or exceeding
   *
   * @param params - Record of parameter symbol to measured value
   * @returns Categorized parameters by status
   */
  static getParameterStatus(params: Record<string, number>): {
    excellent: Array<{ symbol: string; value: number; Sn: number; ratio: number }>;
    acceptable: Array<{ symbol: string; value: number; Sn: number; ratio: number }>;
    exceeding: Array<{ symbol: string; value: number; Sn: number; ratio: number }>;
  } {
    const result: {
      excellent: Array<{ symbol: string; value: number; Sn: number; ratio: number }>;
      acceptable: Array<{ symbol: string; value: number; Sn: number; ratio: number }>;
      exceeding: Array<{ symbol: string; value: number; Sn: number; ratio: number }>;
    } = {
      excellent: [], // ratio < 0.5 (less than 50% of standard)
      acceptable: [], // ratio 0.5-1.0 (50-100% of standard)
      exceeding: [], // ratio > 1.0 (above standard)
    };

    for (const [symbol, value] of Object.entries(params)) {
      const standard = WQI_STANDARDS[symbol];
      if (!standard || standard.Sn === 0) continue;

      // Special handling for pH (ideal is 7, standard is 8.5)
      let ratio: number;
      if (symbol === 'pH') {
        // Deviation from ideal (7)
        ratio = Math.abs(value - 7) / 1.5; // 1.5 is max acceptable deviation
      } else {
        ratio = value / standard.Sn;
      }

      const entry = {
        symbol,
        value,
        Sn: standard.Sn,
        ratio: Math.round(ratio * 10000) / 10000,
      };

      if (ratio < 0.5) {
        result.excellent.push(entry);
      } else if (ratio <= 1.0) {
        result.acceptable.push(entry);
      } else {
        result.exceeding.push(entry);
      }
    }

    // Sort each category by ratio (descending)
    result.excellent.sort((a, b) => b.ratio - a.ratio);
    result.acceptable.sort((a, b) => b.ratio - a.ratio);
    result.exceeding.sort((a, b) => b.ratio - a.ratio);

    return result;
  }

  /**
   * Calculate K (proportionality constant) for given parameters
   * Useful for understanding weight distribution
   *
   * @param paramSymbols - Array of parameter symbols to include
   * @returns K value and individual weights
   */
  static calculateWeights(paramSymbols: string[]): {
    K: number;
    weights: Array<{ symbol: string; Wi: number; percentage: number }>;
  } | null {
    let sumInverseSn = 0;
    const validSymbols: string[] = [];

    for (const symbol of paramSymbols) {
      const standard = WQI_STANDARDS[symbol];
      if (!standard || standard.Sn === 0) continue;

      sumInverseSn += 1 / standard.Sn;
      validSymbols.push(symbol);
    }

    if (sumInverseSn === 0) return null;

    const K = 1 / sumInverseSn;

    const weights = validSymbols.map((symbol) => {
      const standard = WQI_STANDARDS[symbol];
      const Wi = K / standard.Sn;
      return {
        symbol,
        Wi: Math.round(Wi * 10000) / 10000,
        percentage: Math.round(Wi * 10000) / 100, // Wi × 100 for percentage
      };
    });

    // Sort by weight (descending)
    weights.sort((a, b) => b.Wi - a.Wi);

    return {
      K: Math.round(K * 10000) / 10000,
      weights,
    };
  }
}
