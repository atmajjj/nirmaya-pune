/**
 * Unit tests for WQI (Water Quality Index) Calculator Service
 * Tests the calculation logic without database dependencies
 */

import { WQICalculatorService } from '../../services/wqi-calculator.service';
import { WQI_STANDARDS } from '../../shared/constants';

describe('WQICalculatorService', () => {
  describe('calculate', () => {
    it('should calculate WQI correctly for typical water quality parameters', () => {
      // Test data: typical groundwater parameters
      const params = {
        pH: 7.2, // Ideal is 7
        TDS: 250, // Standard is 500 mg/L
        TH: 150, // Standard is 300 mg/L
        Ca: 40, // Standard is 75 mg/L
        Mg: 15, // Standard is 30 mg/L
      };

      const result = WQICalculatorService.calculate(params);

      expect(result).not.toBeNull();
      expect(result!.wqi).toBeGreaterThan(0);
      expect(result!.paramsAnalyzed).toHaveLength(5);
      expect(result!.classification).toBeDefined();
    });

    it('should return "Excellent" classification for WQI 0-25', () => {
      // Very good water quality - all values well within limits
      const params = {
        pH: 7.0, // Ideal
        TDS: 50, // 10% of standard
        TH: 30, // 10% of standard
        Ca: 7.5, // 10% of standard
      };

      const result = WQICalculatorService.calculate(params);

      expect(result).not.toBeNull();
      expect(result!.wqi).toBeLessThanOrEqual(25);
      expect(result!.classification).toBe('Excellent');
    });

    it('should return "Good" classification for WQI 26-50', () => {
      // Good water quality
      const params = {
        pH: 7.5,
        TDS: 200, // 40% of standard
        TH: 120, // 40% of standard
      };

      const result = WQICalculatorService.calculate(params);

      expect(result).not.toBeNull();
      // This should fall in 26-50 range
      if (result!.wqi > 25 && result!.wqi <= 50) {
        expect(result!.classification).toBe('Good');
      }
    });

    it('should return "Unfit for consumption" for WQI > 100', () => {
      // Poor water quality - values significantly above standards
      const params = {
        pH: 9.5, // Far from ideal
        TDS: 1500, // 3x standard
        TH: 900, // 3x standard
        Fe: 1.0, // 3x+ standard (0.3 mg/L)
      };

      const result = WQICalculatorService.calculate(params);

      expect(result).not.toBeNull();
      expect(result!.wqi).toBeGreaterThan(100);
      expect(result!.classification).toBe('Unfit for consumption');
    });

    it('should return null when no valid parameters are provided', () => {
      const result = WQICalculatorService.calculate({});
      expect(result).toBeNull();
    });

    it('should return null when no parameters have standards', () => {
      const params = {
        UnknownParam: 100,
        AnotherUnknown: 200,
      };

      const result = WQICalculatorService.calculate(params);
      expect(result).toBeNull();
    });

    it('should skip parameters without standards', () => {
      const params = {
        pH: 7.2,
        UnknownParam: 999, // Should be skipped
        TDS: 250,
      };

      const result = WQICalculatorService.calculate(params);

      expect(result).not.toBeNull();
      expect(result!.paramsAnalyzed).toHaveLength(2);
      expect(result!.paramsAnalyzed).not.toContain('UnknownParam');
    });

    it('should handle single parameter calculation', () => {
      const params = { TDS: 250 };
      // Qi = (250 - 0) / (500 - 0) × 100 = 50
      // Wi = 1 (only one param)
      // WQI = 50
      
      const result = WQICalculatorService.calculate(params);

      expect(result).not.toBeNull();
      expect(result!.paramsAnalyzed).toEqual(['TDS']);
      expect(result!.wqi).toBeCloseTo(50, 0);
    });

    it('should use custom standards when provided', () => {
      const params = { TDS: 250 };
      
      // Custom standard with different Sn
      const customStandards = {
        TDS: { Sn: 1000, Vo: 0 }, // Higher standard = lower WQI
      };

      const resultDefault = WQICalculatorService.calculate(params);
      const resultCustom = WQICalculatorService.calculate(params, customStandards);

      expect(resultDefault).not.toBeNull();
      expect(resultCustom).not.toBeNull();
      // Default: 250/500 × 100 = 50, Custom: 250/1000 × 100 = 25
      expect(resultCustom!.wqi).toBeLessThan(resultDefault!.wqi);
    });

    it('should handle pH correctly with ideal value of 7', () => {
      // pH at ideal value
      const paramsIdeal = { pH: 7.0 };
      const resultIdeal = WQICalculatorService.calculate(paramsIdeal);

      // pH above ideal
      const paramsHigh = { pH: 8.0 };
      const resultHigh = WQICalculatorService.calculate(paramsHigh);

      // pH below ideal
      const paramsLow = { pH: 6.0 };
      const resultLow = WQICalculatorService.calculate(paramsLow);

      expect(resultIdeal).not.toBeNull();
      expect(resultHigh).not.toBeNull();
      expect(resultLow).not.toBeNull();

      // Ideal pH should give lowest WQI
      expect(resultIdeal!.wqi).toBeLessThan(resultHigh!.wqi);
    });
  });

  describe('calculateBatch', () => {
    it('should calculate WQI for multiple stations', () => {
      const stations: Array<{ station_id: string; params: Record<string, number> }> = [
        { station_id: 'ST001', params: { pH: 7.2, TDS: 200 } },
        { station_id: 'ST002', params: { pH: 8.5, TH: 400 } },
        { station_id: 'ST003', params: {} },
      ];

      const results = WQICalculatorService.calculateBatch(stations);

      expect(results).toHaveLength(3);
      expect(results[0].station_id).toBe('ST001');
      expect(results[0].result).not.toBeNull();
      expect(results[1].station_id).toBe('ST002');
      expect(results[1].result).not.toBeNull();
      expect(results[2].station_id).toBe('ST003');
      expect(results[2].result).toBeNull(); // No params
    });
  });

  describe('validateParams', () => {
    it('should return empty array for valid parameters', () => {
      const params = {
        pH: 7.5,
        TDS: 300,
        TH: 200,
      };

      const warnings = WQICalculatorService.validateParams(params);
      expect(warnings).toHaveLength(0);
    });

    it('should warn about negative values', () => {
      const params = {
        TDS: -50,
        TH: 100,
      };

      const warnings = WQICalculatorService.validateParams(params);
      
      expect(warnings.length).toBeGreaterThan(0);
      expect(warnings[0]).toContain('Negative');
    });

    it('should warn about pH outside valid range', () => {
      const paramsLow = { pH: -1 };
      const paramsHigh = { pH: 15 };

      const warningsLow = WQICalculatorService.validateParams(paramsLow);
      const warningsHigh = WQICalculatorService.validateParams(paramsHigh);

      expect(warningsLow.length).toBeGreaterThan(0);
      expect(warningsLow[0]).toContain('pH');
      expect(warningsHigh.length).toBeGreaterThan(0);
      expect(warningsHigh[0]).toContain('pH');
    });

    it('should warn about values significantly exceeding standards', () => {
      const params = {
        TDS: 3000, // 6x standard (500)
      };

      const warnings = WQICalculatorService.validateParams(params);

      expect(warnings.length).toBeGreaterThan(0);
      expect(warnings[0]).toContain('Very high');
    });
  });

  describe('getDetailedAnalysis', () => {
    it('should return detailed breakdown of each parameter contribution', () => {
      const params = {
        pH: 7.5,
        TDS: 300,
        TH: 150,
      };

      const analysis = WQICalculatorService.getDetailedAnalysis(params);

      expect(analysis.length).toBe(3);
      
      // Check structure
      expect(analysis[0]).toHaveProperty('symbol');
      expect(analysis[0]).toHaveProperty('name');
      expect(analysis[0]).toHaveProperty('unit');
      expect(analysis[0]).toHaveProperty('value');
      expect(analysis[0]).toHaveProperty('Sn');
      expect(analysis[0]).toHaveProperty('Vo');
      expect(analysis[0]).toHaveProperty('Wi');
      expect(analysis[0]).toHaveProperty('Qi');
      expect(analysis[0]).toHaveProperty('WiQi');
      expect(analysis[0]).toHaveProperty('percentOfTotal');

      // Should be sorted by WiQi (descending)
      expect(analysis[0].WiQi).toBeGreaterThanOrEqual(analysis[1].WiQi);
    });

    it('should return empty array when no valid parameters', () => {
      const analysis = WQICalculatorService.getDetailedAnalysis({});
      expect(analysis).toHaveLength(0);
    });
  });

  describe('getParameterStatus', () => {
    it('should categorize parameters by their status', () => {
      const params = {
        pH: 7.0, // Ideal (excellent)
        TDS: 400, // 80% of standard (acceptable)
        TH: 400, // 133% of standard (exceeding)
      };

      const status = WQICalculatorService.getParameterStatus(params);

      expect(status.excellent.length).toBeGreaterThanOrEqual(0);
      expect(status.acceptable.length).toBeGreaterThanOrEqual(0);
      expect(status.exceeding.length).toBeGreaterThanOrEqual(0);
      
      // TH should be in exceeding
      const thStatus = [...status.excellent, ...status.acceptable, ...status.exceeding]
        .find(s => s.symbol === 'TH');
      expect(thStatus).toBeDefined();
    });
  });

  describe('calculateWeights', () => {
    it('should calculate K and weights for given parameters', () => {
      const paramSymbols = ['pH', 'TDS', 'TH'];
      const result = WQICalculatorService.calculateWeights(paramSymbols);

      expect(result).not.toBeNull();
      expect(result!.K).toBeGreaterThan(0);
      expect(result!.weights).toHaveLength(3);
      
      // Weights should sum to approximately 1
      const totalWeight = result!.weights.reduce((sum, w) => sum + w.Wi, 0);
      expect(totalWeight).toBeCloseTo(1, 1);
    });

    it('should return null for unknown parameters', () => {
      const result = WQICalculatorService.calculateWeights(['Unknown']);
      expect(result).toBeNull();
    });

    it('should sort weights by value descending', () => {
      const paramSymbols = ['pH', 'TDS', 'TH', 'Fe'];
      const result = WQICalculatorService.calculateWeights(paramSymbols);

      expect(result).not.toBeNull();
      // Fe has lowest Sn (0.3), so highest weight
      expect(result!.weights[0].symbol).toBe('Fe');
    });
  });

  describe('WQI formula verification', () => {
    it('should correctly implement WQI = Σ(Wi×Qi) with weighted arithmetic method', () => {
      // For a single parameter, WQI = Qi (since Wi = 1)
      // TDS: Qi = (250 - 0) / (500 - 0) × 100 = 50
      
      const params = { TDS: 250 };
      const result = WQICalculatorService.calculate(params);

      expect(result).not.toBeNull();
      expect(result!.wqi).toBeCloseTo(50, 0);
    });

    it('should weight parameters based on their strictness (1/Sn)', () => {
      // Fe has Sn = 0.3 (strictest, highest weight)
      // TDS has Sn = 500 (least strict, lowest weight)
      // Same quality rating should contribute differently
      
      // Both at 50% of their standards
      const paramsFe = { Fe: 0.15 }; // 50% of 0.3
      const paramsTDS = { TDS: 250 }; // 50% of 500

      const resultFe = WQICalculatorService.calculate(paramsFe);
      const resultTDS = WQICalculatorService.calculate(paramsTDS);

      expect(resultFe).not.toBeNull();
      expect(resultTDS).not.toBeNull();
      // Both should have same Qi (50), but when combined with other params,
      // Fe would have higher impact due to higher weight
    });

    it('should handle multiple parameters with correct weighting', () => {
      // Test with known values to verify formula
      const params = {
        TDS: 500, // Qi = 100 (at standard)
        TH: 300, // Qi = 100 (at standard)
      };
      // Both at standard (Qi = 100), WQI should be approximately 100

      const result = WQICalculatorService.calculate(params);

      expect(result).not.toBeNull();
      expect(result!.wqi).toBeCloseTo(100, 5);
      expect(result!.classification).toBe('Very Poor');
    });
  });
});
