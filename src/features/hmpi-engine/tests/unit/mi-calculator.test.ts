/**
 * Unit tests for MI (Metal Index) Calculator Service
 * Tests the calculation logic without database dependencies
 */

import { MICalculatorService } from '../../services/mi-calculator.service';
import { METAL_STANDARDS } from '../../shared/constants';

describe('MICalculatorService', () => {
  describe('calculate', () => {
    it('should calculate MI correctly for typical metal concentrations', () => {
      // Test data: typical groundwater metals (ppb)
      const metals = {
        As: 10, // Arsenic: MAC = 50 ppb
        Cu: 300, // Copper: MAC = 1500 ppb
        Zn: 3000, // Zinc: MAC = 15000 ppb
        Pb: 5, // Lead: MAC = 10 ppb
      };

      const result = MICalculatorService.calculate(metals);

      expect(result).not.toBeNull();
      expect(result!.mi).toBeGreaterThan(0);
      expect(result!.metalsAnalyzed).toHaveLength(4);
      expect(result!.classification).toBeDefined();
      expect(result!.miClass).toBeDefined();
    });

    it('should return "Very Pure" (Class I) for MI < 0.3', () => {
      // Very clean water - all values well below MAC
      const metals = {
        As: 5, // 5/50 = 0.1
        Cu: 100, // 100/1500 = 0.067
      };
      // Total MI = 0.167 (should be Class I)

      const result = MICalculatorService.calculate(metals);

      expect(result).not.toBeNull();
      expect(result!.mi).toBeLessThan(0.3);
      expect(result!.classification).toBe('Very Pure');
      expect(result!.miClass).toBe('Class I');
    });

    it('should return "Pure" (Class II) for MI 0.3-1', () => {
      const metals = {
        As: 25, // 25/50 = 0.5
        Cu: 300, // 300/1500 = 0.2
      };
      // Total MI = 0.7 (should be Class II)

      const result = MICalculatorService.calculate(metals);

      expect(result).not.toBeNull();
      expect(result!.mi).toBeGreaterThanOrEqual(0.3);
      expect(result!.mi).toBeLessThan(1);
      expect(result!.classification).toBe('Pure');
      expect(result!.miClass).toBe('Class II');
    });

    it('should return "Slightly Affected" (Class III) for MI 1-2', () => {
      const metals = {
        As: 50, // 50/50 = 1.0
        Cu: 750, // 750/1500 = 0.5
      };
      // Total MI = 1.5 (should be Class III)

      const result = MICalculatorService.calculate(metals);

      expect(result).not.toBeNull();
      expect(result!.mi).toBeGreaterThanOrEqual(1);
      expect(result!.mi).toBeLessThan(2);
      expect(result!.classification).toBe('Slightly Affected');
      expect(result!.miClass).toBe('Class III');
    });

    it('should return "Seriously Affected" (Class VI) for MI >= 6', () => {
      // Heavily polluted water
      const metals = {
        As: 200, // 200/50 = 4.0
        Pb: 30, // 30/10 = 3.0
      };
      // Total MI = 7.0 (should be Class VI)

      const result = MICalculatorService.calculate(metals);

      expect(result).not.toBeNull();
      expect(result!.mi).toBeGreaterThanOrEqual(6);
      expect(result!.classification).toBe('Seriously Affected');
      expect(result!.miClass).toBe('Class VI');
    });

    it('should return null when no valid metals are provided', () => {
      const result = MICalculatorService.calculate({});
      expect(result).toBeNull();
    });

    it('should return null when no metals have MAC values', () => {
      const metals = {
        UnknownMetal: 100,
        AnotherUnknown: 200,
      };

      const result = MICalculatorService.calculate(metals);
      expect(result).toBeNull();
    });

    it('should skip metals without MAC values', () => {
      const metals = {
        As: 10,
        UnknownMetal: 999, // Should be skipped
        Cu: 50,
      };

      const result = MICalculatorService.calculate(metals);

      expect(result).not.toBeNull();
      expect(result!.metalsAnalyzed).toHaveLength(2);
      expect(result!.metalsAnalyzed).not.toContain('UnknownMetal');
    });

    it('should handle single metal calculation', () => {
      const metals = { As: 25 };
      // MI = 25/50 = 0.5 (Class II)
      
      const result = MICalculatorService.calculate(metals);

      expect(result).not.toBeNull();
      expect(result!.metalsAnalyzed).toEqual(['As']);
      expect(result!.mi).toBeCloseTo(0.5, 2);
    });

    it('should use custom MAC values when provided', () => {
      const metals = { As: 50 };
      
      // Custom MAC with different value
      const customMAC = {
        As: 100, // Higher MAC = lower MI
      };

      const resultDefault = MICalculatorService.calculate(metals);
      const resultCustom = MICalculatorService.calculate(metals, customMAC);

      expect(resultDefault).not.toBeNull();
      expect(resultCustom).not.toBeNull();
      // Default: 50/50 = 1.0, Custom: 50/100 = 0.5
      expect(resultDefault!.mi).toBeCloseTo(1.0, 2);
      expect(resultCustom!.mi).toBeCloseTo(0.5, 2);
    });

    it('should handle zero concentration correctly', () => {
      const metals = {
        As: 0,
        Cu: 0,
        Pb: 0,
      };

      const result = MICalculatorService.calculate(metals);

      expect(result).not.toBeNull();
      expect(result!.mi).toBe(0);
      expect(result!.classification).toBe('Very Pure');
    });
  });

  describe('calculateBatch', () => {
    it('should calculate MI for multiple stations', () => {
      const stations: Array<{ station_id: string; metals: Record<string, number> }> = [
        { station_id: 'ST001', metals: { As: 10, Cu: 50 } },
        { station_id: 'ST002', metals: { As: 100, Pb: 30 } },
        { station_id: 'ST003', metals: {} },
      ];

      const results = MICalculatorService.calculateBatch(stations);

      expect(results).toHaveLength(3);
      expect(results[0].station_id).toBe('ST001');
      expect(results[0].result).not.toBeNull();
      expect(results[1].station_id).toBe('ST002');
      expect(results[1].result).not.toBeNull();
      expect(results[2].station_id).toBe('ST003');
      expect(results[2].result).toBeNull(); // No metals
    });
  });

  describe('validateMetals', () => {
    it('should return empty array for valid concentrations', () => {
      const metals = {
        As: 10,
        Cu: 50,
        Zn: 1000,
      };

      const warnings = MICalculatorService.validateMetals(metals);
      expect(warnings).toHaveLength(0);
    });

    it('should warn about negative concentrations', () => {
      const metals = {
        As: -5,
        Cu: 50,
      };

      const warnings = MICalculatorService.validateMetals(metals);
      
      expect(warnings.length).toBeGreaterThan(0);
      expect(warnings[0]).toContain('Negative');
    });

    it('should warn when concentration exceeds MAC', () => {
      const metals = {
        As: 100, // 2x above MAC (50 ppb)
      };

      const warnings = MICalculatorService.validateMetals(metals);

      expect(warnings.length).toBeGreaterThan(0);
      expect(warnings[0]).toContain('Exceeds MAC');
    });
  });

  describe('getDetailedAnalysis', () => {
    it('should return detailed breakdown of each metal contribution', () => {
      const metals = {
        As: 30,
        Cu: 100,
        Pb: 5,
      };

      const analysis = MICalculatorService.getDetailedAnalysis(metals);

      expect(analysis.length).toBe(3);
      
      // Check structure
      expect(analysis[0]).toHaveProperty('symbol');
      expect(analysis[0]).toHaveProperty('name');
      expect(analysis[0]).toHaveProperty('concentration');
      expect(analysis[0]).toHaveProperty('MAC');
      expect(analysis[0]).toHaveProperty('ratio');
      expect(analysis[0]).toHaveProperty('percentOfTotal');

      // Should be sorted by ratio (descending)
      expect(analysis[0].ratio).toBeGreaterThanOrEqual(analysis[1].ratio);
    });

    it('should return empty array when no valid metals', () => {
      const analysis = MICalculatorService.getDetailedAnalysis({});
      expect(analysis).toHaveLength(0);
    });
  });

  describe('getThresholdComparison', () => {
    it('should categorize metals by their MAC status', () => {
      const metals = {
        As: 10, // 10/50 = 0.2 (safe)
        Cu: 1000, // 1000/1500 = 0.67 (warning)
        Pb: 15, // 15/10 = 1.5 (exceeded)
      };

      const comparison = MICalculatorService.getThresholdComparison(metals);

      expect(comparison.safe.length).toBe(1);
      expect(comparison.safe[0].symbol).toBe('As');
      
      expect(comparison.warning.length).toBe(1);
      expect(comparison.warning[0].symbol).toBe('Cu');
      
      expect(comparison.exceeded.length).toBe(1);
      expect(comparison.exceeded[0].symbol).toBe('Pb');
    });

    it('should sort each category by ratio descending', () => {
      const metals = {
        As: 20, // 20/50 = 0.4 (safe)
        Cu: 200, // 200/1500 = 0.13 (safe)
        Zn: 5000, // 5000/15000 = 0.33 (safe)
      };

      const comparison = MICalculatorService.getThresholdComparison(metals);

      expect(comparison.safe.length).toBe(3);
      // Should be sorted: As (0.4), Zn (0.33), Cu (0.13)
      expect(comparison.safe[0].symbol).toBe('As');
    });
  });

  describe('MI formula verification', () => {
    it('should correctly implement MI = Σ(Ci/MACi)', () => {
      // Manual calculation for verification
      // As: 25/50 = 0.5
      // Cu: 750/1500 = 0.5
      // MI = 0.5 + 0.5 = 1.0
      
      const metals = { As: 25, Cu: 750 };
      const result = MICalculatorService.calculate(metals);

      expect(result).not.toBeNull();
      expect(result!.mi).toBeCloseTo(1.0, 2);
    });

    it('should sum contributions from all metals', () => {
      // Each metal contributes Ci/MACi
      const metals = {
        As: 50, // 50/50 = 1.0
        Cu: 1500, // 1500/1500 = 1.0
        Pb: 10, // 10/10 = 1.0
      };
      // Total MI = 3.0

      const result = MICalculatorService.calculate(metals);

      expect(result).not.toBeNull();
      expect(result!.mi).toBeCloseTo(3.0, 2);
      expect(result!.classification).toBe('Moderately Affected');
      expect(result!.miClass).toBe('Class IV');
    });
  });
});
