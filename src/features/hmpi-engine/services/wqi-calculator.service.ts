/**
 * WQI (Water Quality Index) Calculator Service
 * 
 * EXACT implementation from Flutter reference code
 * 
 * ============================================================================
 * METHODOLOGY (Brown et al., 1972)
 * ============================================================================
 * 
 * Step 1: Calculate 1/Sn for each parameter:
 *     invSn_i = 1 / Sn_i
 * 
 * Step 2: Calculate sum of all invSn:
 *     sumInvSn = Σ invSn_i
 * 
 * Step 3: Calculate constant K:
 *     K = 1 / sumInvSn
 * 
 * Step 4: Calculate relative weight Wi for each parameter:
 *     Wi_i = K × (1/Sn_i)
 *     Note: Σ Wi = 1 (normalized)
 * 
 * Step 5: Calculate quality rating Qi for each parameter:
 *     Qi_i = ((Vn_i - Vo_i) / (Sn_i - Vo_i)) × 100
 *     Special: For pH, use absolute deviation |Vn - Vo| / |Sn - Vo| × 100
 * 
 * Step 6: Calculate contribution WiQi:
 *     WiQi_i = Wi_i × Qi_i
 * 
 * Step 7: Calculate overall WQI:
 *     WQI = Σ WiQi_i
 * 
 * Where:
 *   - Sn = BIS standard (permissible/max value)
 *   - Vo = Ideal value (7 for pH, 0 for others)
 *   - Vn = Measured mean value
 *   - Wi = Relative weight
 *   - Qi = Quality rating
 * 
 * ============================================================================
 * WQI CLASSIFICATION (Brown et al., 1972)
 * ============================================================================
 * 
 * 0 – 25      → "Excellent"
 * 26 – 50     → "Good"
 * 51 – 75     → "Poor"
 * 76 – 100    → "Very Poor"
 * > 100       → "Unfit for consumption"
 * 
 * Test Case: pH=7.9, EC=100.33, TDS=67.22, TH=40.67, Ca=55.61, Mg=6.48, 
 *            Fe=0.05, F=0.02, Turb=1.3
 * Expected WQI: 15.24
 * 
 * Reference: BIS 10500:2012, WHO Guidelines
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
   * EXACT Flutter formulas (Brown et al., 1972):
   * 1. invSn = 1 / Sn for each parameter
   * 2. sumInvSn = Σ(invSn)
   * 3. K = 1 / sumInvSn
   * 4. Wi = K × invSn for each parameter
   * 5. Qi = ((Vn - Vo) / (Sn - Vo)) × 100
   * 6. WiQi = Wi × Qi
   * 7. WQI = Σ(WiQi)
   *
   * @param params - Record of parameter symbol to measured value (Vn)
   * @param customStandards - Optional custom standards (defaults to BIS)
   * @returns WQIResult with WQI value, classification, and detailed breakdown
   */
  static calculate(
    params: Record<string, number>,
    customStandards?: Record<string, { Sn: number; Vo: number }>
  ): WQIResult | null {
    const standards = customStandards || WQI_STANDARDS;
    const paramsAnalyzed: string[] = [];
    const invSn: Record<string, number> = {};
    const weights: Record<string, number> = {};
    const qi: Record<string, number> = {};
    const wiQi: Record<string, number> = {};

    // Step 1 & 2: Calculate invSn = 1/Sn for each parameter and sum
    let sumInvSn = 0.0;
    const validParams: Array<{ symbol: string; Vn: number; Sn: number; Vo: number }> = [];

    for (const [symbol, Vn] of Object.entries(params)) {
      const standard = standards[symbol];
      if (!standard) continue;

      const Sn = standard.Sn;
      const Vo = standard.Vo;

      // Skip parameters with invalid standards
      if (Sn <= 0) continue;

      // Step 1: Calculate invSn = 1 / Sn
      const invSnValue = 1.0 / Sn;
      invSn[symbol] = invSnValue;

      // Step 2: Accumulate sum
      sumInvSn += invSnValue;

      validParams.push({ symbol, Vn, Sn, Vo });
      paramsAnalyzed.push(symbol);
    }

    // Need at least one parameter for calculation
    if (validParams.length === 0 || sumInvSn === 0) {
      return null;
    }

    // Step 3: Calculate constant K = 1 / sumInvSn
    const k = 1.0 / sumInvSn;

    // Step 4-7: Calculate Wi, Qi, WiQi and accumulate WQI
    let sumWiQi = 0.0;
    let sumWeights = 0.0;

    for (const { symbol, Vn, Sn, Vo } of validParams) {
      // Step 4: Wi = K × invSn
      const Wi = k * invSn[symbol];
      weights[symbol] = Wi;
      sumWeights += Wi;

      // Step 5: Qi = ((Vn - Vo) / (Sn - Vo)) × 100
      // Special handling for pH: use absolute deviation
      let Qi: number;
      if (symbol.toLowerCase() === 'ph') {
        Qi = (Math.abs(Vn - Vo) / Math.abs(Sn - Vo)) * 100.0;
      } else {
        Qi = ((Vn - Vo) / (Sn - Vo)) * 100.0;
      }
      qi[symbol] = Qi;

      // Step 6: WiQi = Wi × Qi
      const WiQiValue = Wi * Qi;
      wiQi[symbol] = WiQiValue;

      // Step 7: Accumulate WQI
      sumWiQi += WiQiValue;
    }

    // WQI is the sum of WiQi
    const wqi = sumWiQi;

    return {
      wqi,
      classification: classifyWQI(wqi),
      paramsAnalyzed,
      invSn,
      weights,
      qi,
      wiQi,
      sumInvSn,
      k,
      sumWeights,
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
   * EXACT Flutter formulas:
   * - invSn = 1 / Sn
   * - K = 1 / Σ(invSn)
   * - Wi = K × invSn
   * - Qi = ((Vn - Vo) / (Sn - Vo)) × 100
   * - WiQi = Wi × Qi
   *
   * @param params - Record of parameter symbol to measured value (Vn)
   * @returns Array of detailed parameter analysis sorted by contribution
   */
  static getDetailedAnalysis(params: Record<string, number>): Array<{
    symbol: string;
    name: string;
    unit: string;
    Vn: number;          // Measured value
    Sn: number;          // Standard value
    Vo: number;          // Ideal value
    invSn: number;       // 1/Sn
    Wi: number;          // Relative weight
    Qi: number;          // Quality rating
    WiQi: number;        // Contribution
    percentOfTotal: number;
  }> {
    const analysis: Array<{
      symbol: string;
      name: string;
      unit: string;
      Vn: number;
      Sn: number;
      Vo: number;
      invSn: number;
      Wi: number;
      Qi: number;
      WiQi: number;
      percentOfTotal: number;
    }> = [];

    // Step 1 & 2: Calculate invSn and sumInvSn
    let sumInvSn = 0.0;
    const validParams: Array<{ symbol: string; Vn: number; Sn: number; Vo: number; invSn: number }> = [];

    for (const [symbol, Vn] of Object.entries(params)) {
      const standard = WQI_STANDARDS[symbol];
      if (!standard || standard.Sn <= 0) continue;

      const invSnValue = 1.0 / standard.Sn;
      sumInvSn += invSnValue;
      validParams.push({ 
        symbol, 
        Vn, 
        Sn: standard.Sn, 
        Vo: standard.Vo, 
        invSn: invSnValue 
      });
    }

    if (sumInvSn === 0) return analysis;

    // Step 3: Calculate K
    const k = 1.0 / sumInvSn;

    // Calculate total WQI for percentage
    let totalWQI = 0.0;

    for (const { symbol, Vn, Sn, Vo, invSn: invSnValue } of validParams) {
      const Wi = k * invSnValue;
      
      // Special handling for pH
      let Qi: number;
      if (symbol.toLowerCase() === 'ph') {
        Qi = (Math.abs(Vn - Vo) / Math.abs(Sn - Vo)) * 100.0;
      } else {
        Qi = ((Vn - Vo) / (Sn - Vo)) * 100.0;
      }
      
      const WiQi = Wi * Qi;
      totalWQI += WiQi;
    }

    // Build detailed analysis
    for (const { symbol, Vn, Sn, Vo, invSn: invSnValue } of validParams) {
      const standard = WQI_STANDARDS[symbol];
      if (!standard) continue;

      const Wi = k * invSnValue;
      
      let Qi: number;
      if (symbol.toLowerCase() === 'ph') {
        Qi = (Math.abs(Vn - Vo) / Math.abs(Sn - Vo)) * 100.0;
      } else {
        Qi = ((Vn - Vo) / (Sn - Vo)) * 100.0;
      }
      
      const WiQi = Wi * Qi;
      const percentOfTotal = totalWQI !== 0 ? (WiQi / totalWQI) * 100 : 0;

      analysis.push({
        symbol,
        name: standard.name,
        unit: standard.unit,
        Vn,
        Sn,
        Vo,
        invSn: invSnValue,
        Wi,
        Qi,
        WiQi,
        percentOfTotal,
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
