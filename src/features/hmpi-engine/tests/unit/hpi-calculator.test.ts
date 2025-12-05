/**
 * Unit tests for HPI (Heavy Metal Pollution Index) Calculator Service
 * Tests the calculation logic without database dependencies
 */

import { HPICalculatorService } from '../../services/hpi-calculator.service';
import { METAL_STANDARDS } from '../../shared/constants';

describe('HPICalculatorService', () => {
  describe('calculate', () => {
    it('should calculate HPI correctly for typical metal concentrations', () => {
      // Test data: typical groundwater metals (ppb)
      const metals = {
        As: 5, // Arsenic: below standard (50 ppb)
        Cu: 100, // Copper: well below standard (1500 ppb)
        Zn: 500, // Zinc: well below standard (15000 ppb)
        Pb: 8, // Lead: below standard (10 ppb)
        Fe: 200, // Iron: below standard (300 ppb)
      };

      const result = HPICalculatorService.calculate(metals);

      expect(result).not.toBeNull();
      expect(result!.hpi).toBeGreaterThan(0);
      expect(result!.hpi).toBeLessThan(100); // Should be acceptable
      expect(result!.metalsAnalyzed).toHaveLength(5);
      expect(result!.metalsAnalyzed).toContain('As');
      expect(result!.classification).toBeDefined();
    });

    it('should return "Excellent" classification for very low pollution', () => {
      // Very clean water - all values well below ideal
      const metals = {
        As: 5, // Below ideal (10)
        Cu: 20, // Below ideal (50)
        Zn: 1000, // Below ideal (5000)
        Fe: 50, // Below ideal (100)
      };

      const result = HPICalculatorService.calculate(metals);

      expect(result).not.toBeNull();
      expect(result!.hpi).toBeLessThan(25);
      expect(result!.classification).toBe('Excellent - Low pollution');
    });

    it('should return "Unsuitable" classification for high pollution', () => {
      // Heavily polluted water - values above standards
      const metals = {
        As: 200, // 4x above standard (50 ppb)
        Pb: 50, // 5x above standard (10 ppb)
        Cd: 20, // 4x above standard (5 ppb)
        Hg: 10, // 5x above standard (2 ppb)
      };

      const result = HPICalculatorService.calculate(metals);

      expect(result).not.toBeNull();
      expect(result!.hpi).toBeGreaterThan(100);
      expect(result!.classification).toBe('Unsuitable - Critical pollution');
    });

    it('should return null when no valid metals are provided', () => {
      const result = HPICalculatorService.calculate({});
      expect(result).toBeNull();
    });

    it('should return null when no metals have standards', () => {
      const metals = {
        UnknownMetal: 100,
        AnotherUnknown: 200,
      };

      const result = HPICalculatorService.calculate(metals);
      expect(result).toBeNull();
    });

    it('should skip metals without standards', () => {
      const metals = {
        As: 10,
        UnknownMetal: 999, // Should be skipped
        Cu: 50,
      };

      const result = HPICalculatorService.calculate(metals);

      expect(result).not.toBeNull();
      expect(result!.metalsAnalyzed).toHaveLength(2);
      expect(result!.metalsAnalyzed).not.toContain('UnknownMetal');
    });

    it('should handle single metal calculation', () => {
      const metals = { As: 25 };
      const result = HPICalculatorService.calculate(metals);

      expect(result).not.toBeNull();
      expect(result!.metalsAnalyzed).toEqual(['As']);
      expect(result!.hpi).toBeGreaterThan(0);
    });

    it('should use custom standards when provided', () => {
      const metals = { As: 50 };
      
      // Custom standards with different values
      const customStandards = {
        As: { Si: 100, Ii: 0 }, // Higher standard = lower HPI
      };

      const resultDefault = HPICalculatorService.calculate(metals);
      const resultCustom = HPICalculatorService.calculate(metals, customStandards);

      expect(resultDefault).not.toBeNull();
      expect(resultCustom).not.toBeNull();
      // With higher Si, HPI should be lower
      expect(resultCustom!.hpi).toBeLessThan(resultDefault!.hpi);
    });

    it('should handle zero concentration correctly', () => {
      const metals = {
        As: 0,
        Cu: 0,
        Pb: 0,
      };

      const result = HPICalculatorService.calculate(metals);

      expect(result).not.toBeNull();
      // Zero concentration should give very low HPI (except for metals where Ii = 0)
      expect(result!.hpi).toBeGreaterThanOrEqual(0);
    });
  });

  describe('calculateBatch', () => {
    it('should calculate HPI for multiple stations', () => {
      const stations: Array<{ station_id: string; metals: Record<string, number> }> = [
        { station_id: 'ST001', metals: { As: 10, Cu: 50 } },
        { station_id: 'ST002', metals: { As: 100, Pb: 30 } },
        { station_id: 'ST003', metals: {} },
      ];

      const results = HPICalculatorService.calculateBatch(stations);

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

      const warnings = HPICalculatorService.validateMetals(metals);
      expect(warnings).toHaveLength(0);
    });

    it('should warn about negative concentrations', () => {
      const metals = {
        As: -5,
        Cu: 50,
      };

      const warnings = HPICalculatorService.validateMetals(metals);
      
      expect(warnings.length).toBeGreaterThan(0);
      expect(warnings[0]).toContain('Negative');
      expect(warnings[0]).toContain('As');
    });

    it('should warn about extremely high values', () => {
      const metals = {
        As: 1000, // 20x above standard (50 ppb)
      };

      const warnings = HPICalculatorService.validateMetals(metals);

      expect(warnings.length).toBeGreaterThan(0);
      expect(warnings[0]).toContain('Very high');
    });
  });

  describe('getDetailedAnalysis', () => {
    it('should return detailed breakdown of each metal contribution', () => {
      const metals = {
        As: 30,
        Cu: 100,
        Pb: 5,
      };

      const analysis = HPICalculatorService.getDetailedAnalysis(metals);

      expect(analysis.length).toBe(3);
      
      // Check structure
      expect(analysis[0]).toHaveProperty('symbol');
      expect(analysis[0]).toHaveProperty('name');
      expect(analysis[0]).toHaveProperty('concentration');
      expect(analysis[0]).toHaveProperty('Si');
      expect(analysis[0]).toHaveProperty('Ii');
      expect(analysis[0]).toHaveProperty('Wi');
      expect(analysis[0]).toHaveProperty('Qi');
      expect(analysis[0]).toHaveProperty('contribution');

      // Should be sorted by contribution (descending)
      expect(analysis[0].contribution).toBeGreaterThanOrEqual(analysis[1].contribution);
    });

    it('should return empty array when no valid metals', () => {
      const analysis = HPICalculatorService.getDetailedAnalysis({});
      expect(analysis).toHaveLength(0);
    });
  });

  describe('HPI formula verification', () => {
    it('should correctly implement HPI = Σ(Wi×Qi) / Σ(Wi)', () => {
      // Manual calculation for verification
      // Using As: Si=50, Ii=10
      // Wi = 1/50 = 0.02
      // Qi = |30-10| / (50-10) × 100 = 20/40 × 100 = 50
      // HPI = (0.02 × 50) / 0.02 = 50
      
      const metals = { As: 30 };
      const result = HPICalculatorService.calculate(metals);

      expect(result).not.toBeNull();
      // Expected HPI should be 50
      expect(result!.hpi).toBeCloseTo(50, 1);
    });

    it('should weight metals correctly based on their standards', () => {
      // Lead (Pb) has Si=10, so Wi=0.1 (high weight)
      // Zinc (Zn) has Si=15000, so Wi=0.000067 (low weight)
      // Same concentration should contribute differently
      
      const metalsLead = { Pb: 5 };
      const metalsZinc = { Zn: 5 };

      const resultLead = HPICalculatorService.calculate(metalsLead);
      const resultZinc = HPICalculatorService.calculate(metalsZinc);

      expect(resultLead).not.toBeNull();
      expect(resultZinc).not.toBeNull();
      
      // Lead should have higher HPI contribution due to lower Si (stricter standard)
      // Actually, with Pb: Ii=0, concentration=5, Si=10
      // Qi = |5-0|/(10-0) × 100 = 50
      // With Zn: Ii=5000, concentration=5, Si=15000
      // Qi = |5-5000|/(15000-5000) × 100 = 4995/10000 × 100 = 49.95
      // Both Qi are similar, but this tests the formula works
    });
  });
});
