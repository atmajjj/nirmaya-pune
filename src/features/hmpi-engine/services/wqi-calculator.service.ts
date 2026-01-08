/**
 * WQI (Water Quality Index) Calculator Service
 * 
 * Implementation of Custom WQI Formula (matching existing data)
 * 
 * Formula:
 * Wi = Fixed weights based on parameter groups:
 *   - pH, TH, TDS, F: 1/8 = 0.125
 *   - Fe, Cl, AK: 3/32 = 0.09375
 *   - NO3: 5/32 = 0.15625
 *   - SO4: 1/16 = 0.0625
 * Qi = ((Vn - Vo) / (Sn - Vo)) × 100
 * WQI = Σ(Wi × Qi)
 * 
 * Classification:
 * - Excellent: 0-25
 * - Good: 26-50
 * - Poor: 51-75
 * - Very Poor: 76-100
 * - Unsuitable: >100
 */

import { WQI_STANDARDS } from '../shared/constants';
import { WQIResult } from '../shared/interface';

/**
 * Fixed weights for WQI calculation (matching existing data formula)
 */
const CUSTOM_WQI_WEIGHTS: Record<string, number> = {
  pH: 1 / 8,        // 0.125
  TH: 1 / 8,        // 0.125
  TDS: 1 / 8,       // 0.125
  F: 1 / 8,         // 0.125
  Fe: 3 / 32,       // 0.09375
  Cl: 3 / 32,       // 0.09375
  AK: 3 / 32,       // 0.09375
  TA: 3 / 32,       // 0.09375 (alias for AK)
  NO3: 5 / 32,      // 0.15625
  SO4: 1 / 16,      // 0.0625
};

export class WQICalculatorService {
  /**
   * Calculate Water Quality Index (WQI) using Custom Weights method
   * 
   * @param params - Water quality parameters (e.g., pH, TDS, TH, etc.)
   * @param customStandards - Optional custom standards (default: WQI_STANDARDS)
   * @returns WQIResult with WQI value, classification, and details, or null if insufficient data
   */
  static calculate(
    params: Record<string, number>,
    customStandards?: Record<string, { Sn: number; Vo: number }>
  ): WQIResult | null {
    const standards = customStandards || WQI_STANDARDS;

    // Step 1: Validate and prepare parameters
    const validParams: Array<{
      symbol: string;
      Vn: number;
      Sn: number;
      Vo: number;
      Wi: number;
    }> = [];

    for (const [symbol, Vn] of Object.entries(params)) {
      // Skip null, undefined, or zero values
      if (Vn === null || Vn === undefined || Vn === 0 || Vn < 0.001) {
        continue;
      }

      const standard = standards[symbol];
      if (!standard) {
        // Parameter has no standard - skip
        continue;
      }

      // Check if parameter has a custom weight
      const customWeight = CUSTOM_WQI_WEIGHTS[symbol];
      if (!customWeight) {
        // Parameter not included in custom weight formula - skip
        continue;
      }

      const { Sn, Vo } = standard;

      // Skip if Sn = 0 or Sn = Vo (division by zero protection)
      if (Sn === 0 || Sn === Vo) {
        console.warn(`Skipping ${symbol}: Sn must be > 0 and Sn ≠ Vo`);
        continue;
      }

      validParams.push({ symbol, Vn, Sn, Vo, Wi: customWeight });
    }

    // Need at least one valid parameter
    if (validParams.length === 0) {
      return null;
    }

    // Step 2: Calculate WQI using fixed weights
    let wqi = 0;
    const paramsAnalyzed: string[] = [];
    const weights: Record<string, number> = {};
    const qualityRatings: Record<string, number> = {};
    const contributions: Record<string, number> = {};

    for (const { symbol, Vn, Sn, Vo, Wi } of validParams) {
      // Calculate Qi = ((Vn - Vo) / (Sn - Vo)) * 100
      const Qi = ((Vn - Vo) / (Sn - Vo)) * 100.0;

      // Calculate contribution = Wi × Qi
      const WiQi = Wi * Qi;

      // Accumulate WQI
      wqi += WiQi;

      paramsAnalyzed.push(symbol);
      weights[symbol] = Wi;
      qualityRatings[symbol] = Qi;
      contributions[symbol] = WiQi;
    }

    // Round to 2 decimal places
    const roundedWQI = Math.round(wqi * 100) / 100;

    return {
      wqi: roundedWQI,
      classification: this.classifyWQI(roundedWQI),
      paramsAnalyzed,
      weights,
      qualityRatings,
      contributions,
      K: 1, // Not used in custom formula, but kept for interface compatibility
      sumInvSn: 0, // Not used in custom formula
      invSn: {}, // Not used in custom formula
    };
  }

  /**
   * Classify WQI value according to standard WQI classification
   * 
   * @param wqi - Water Quality Index value
   * @returns Classification string
   */
  static classifyWQI(wqi: number): string {
    if (wqi <= 25) return 'EXCELLENT';
    if (wqi <= 50) return 'GOOD';
    if (wqi <= 75) return 'POOR';
    if (wqi <= 100) return 'VERY POOR';
    return 'UNSUITABLE';
  }

  /**
   * Calculate WQI for multiple stations in batch
   * 
   * @param stations - Array of stations with their parameters
   * @param customStandards - Optional custom standards
   * @returns Array of results for each station
   */
  static calculateBatch(
    stations: Array<{ station_id: string; params: Record<string, number> }>,
    customStandards?: Record<string, { Sn: number; Vo: number }>
  ): Array<{ station_id: string; result: WQIResult | null }> {
    return stations.map((station) => ({
      station_id: station.station_id,
      result: this.calculate(station.params, customStandards),
    }));
  }

  /**
   * Validate parameters and return warnings
   * 
   * @param params - Water quality parameters
   * @returns Array of warning messages
   */
  static validateParams(params: Record<string, number>): string[] {
    const warnings: string[] = [];

    for (const [symbol, value] of Object.entries(params)) {
      if (value < 0) {
        warnings.push(`Negative value for ${symbol}: ${value}`);
      }

      // Warn about extremely high values (potential data entry errors)
      if (symbol === 'pH' && (value < 0 || value > 14)) {
        warnings.push(`pH value out of range (0-14): ${value}`);
      }

      if (symbol === 'TDS' && value > 10000) {
        warnings.push(`TDS value unusually high: ${value} mg/L`);
      }

      if (symbol === 'EC' && value > 10000) {
        warnings.push(`EC value unusually high: ${value} µS/cm`);
      }
    }

    return warnings;
  }
}
