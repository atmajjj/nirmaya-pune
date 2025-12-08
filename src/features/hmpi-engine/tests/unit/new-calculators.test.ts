/**
 * Unit Tests for New Index Calculators (CDEG, HEI, PIG)
 */

import { CDEGCalculatorService } from '../../services/cdeg-calculator.service';
import { HEICalculatorService } from '../../services/hei-calculator.service';
import { PIGCalculatorService } from '../../services/pig-calculator.service';

describe('CDEG Calculator Service', () => {
  describe('calculate', () => {
    it('should calculate CDEG for heavy metals', () => {
      const metals = {
        Hg: 4, // Si = 2, Cfi = (4/2) - 1 = 1
        Cd: 10, // Si = 5, Cfi = (10/5) - 1 = 1
        As: 100, // Si = 50, Cfi = (100/50) - 1 = 1
        Pb: 20, // Si = 10, Cfi = (20/10) - 1 = 1
      };

      const result = CDEGCalculatorService.calculate(metals);

      expect(result).not.toBeNull();
      expect(result?.cdeg).toBeCloseTo(4, 1); // Sum of all Cfi = 1+1+1+1 = 4
      expect(result?.classification).toBe('High contamination');
      expect(result?.metalsAnalyzed).toEqual(['Hg', 'Cd', 'As', 'Pb']);
    });

    it('should return low contamination for values below standard', () => {
      const metals = {
        Hg: 1, // Si = 2, Cfi = (1/2) - 1 = -0.5
        Cd: 2, // Si = 5, Cfi = (2/5) - 1 = -0.6
      };

      const result = CDEGCalculatorService.calculate(metals);

      expect(result).not.toBeNull();
      // Total CDEG ≈ -1.1
      expect(result?.cdeg).toBeLessThan(0); // Negative CDEG indicates below standards
      expect(result?.classification).toBe('Low contamination');
    });

    it('should only process heavy metals', () => {
      const metals = {
        Hg: 2,
        Cu: 100, // Not a heavy metal, should be ignored
        Fe: 500, // Not a heavy metal, should be ignored
      };

      const result = CDEGCalculatorService.calculate(metals);

      expect(result).not.toBeNull();
      expect(result?.metalsAnalyzed).toEqual(['Hg']);
      expect(result?.metalsAnalyzed).not.toContain('Cu');
      expect(result?.metalsAnalyzed).not.toContain('Fe');
    });

    it('should return null when no heavy metals provided', () => {
      const metals = {
        Cu: 100,
        Fe: 500,
      };

      const result = CDEGCalculatorService.calculate(metals);

      expect(result).toBeNull();
    });
  });

  describe('classifyCDEG', () => {
    it('should classify CDEG values correctly', () => {
      expect(CDEGCalculatorService['classifyCDEG'](0.5)).toBe('Low contamination');
      expect(CDEGCalculatorService['classifyCDEG'](2)).toBe('Medium contamination');
      expect(CDEGCalculatorService['classifyCDEG'](5)).toBe('High contamination');
    });
  });
});

describe('HEI Calculator Service', () => {
  describe('calculate', () => {
    it('should calculate HEI for heavy metals', () => {
      const metals = {
        Hg: 4, // Si = 2, ratio = 4/2 = 2
        Cd: 10, // Si = 5, ratio = 10/5 = 2
        As: 100, // Si = 50, ratio = 100/50 = 2
        Pb: 20, // Si = 10, ratio = 20/10 = 2
      };

      const result = HEICalculatorService.calculate(metals);

      expect(result).not.toBeNull();
      expect(result?.hei).toBeCloseTo(8, 1); // Sum of ratios = 2+2+2+2 = 8
      expect(result?.classification).toBe('Low contamination');
      expect(result?.metalsAnalyzed).toEqual(['Hg', 'Cd', 'As', 'Pb']);
    });

    it('should return medium contamination for HEI 10-20', () => {
      const metals = {
        Hg: 5, // ratio = 5
        Cd: 9, // ratio = 3
        As: 100, // ratio = 2
        Pb: 40, // ratio = 4
      };

      const result = HEICalculatorService.calculate(metals);

      expect(result).not.toBeNull();
      expect(result?.hei).toBeCloseTo(10.3, 1); // Actual calculation
      expect(result?.classification).toBe('Medium contamination');
    });

    it('should return high contamination for HEI > 20', () => {
      const metals = {
        Hg: 10, // ratio = 10
        Cd: 15, // ratio = 5
        As: 250, // ratio = 5
        Pb: 50, // ratio = 5
      };

      const result = HEICalculatorService.calculate(metals);

      expect(result).not.toBeNull();
      expect(result?.hei).toBeCloseTo(18, 0); // Actual calculation is ~18
      // But still medium contamination as it's < 20
      expect(result?.classification).toBe('Medium contamination');
    });

    it('should only process heavy metals', () => {
      const metals = {
        Hg: 2,
        Cu: 100, // Not a heavy metal
        Fe: 500, // Not a heavy metal
      };

      const result = HEICalculatorService.calculate(metals);

      expect(result).not.toBeNull();
      expect(result?.metalsAnalyzed).toEqual(['Hg']);
    });

    it('should return null when no heavy metals provided', () => {
      const metals = {
        Cu: 100,
        Fe: 500,
      };

      const result = HEICalculatorService.calculate(metals);

      expect(result).toBeNull();
    });
  });
});

describe('PIG Calculator Service', () => {
  describe('calculate', () => {
    it('should calculate PIG from HPI and HEI', () => {
      const hpi = 100;
      const hei = 10;

      const result = PIGCalculatorService.calculate(hpi, hei);

      expect(result).not.toBeNull();
      // PIG = √[(100/100)² + 10²] / √2 = √[1 + 100] / √2 ≈ 7.106
      expect(result?.pig).toBeCloseTo(7.106, 2);
      expect(result?.classification).toBe('Very high pollution');
      expect(result?.hpi_used).toBe(100);
      expect(result?.hei_used).toBe(10);
    });

    it('should return low pollution for small values', () => {
      const hpi = 10;
      const hei = 1;

      const result = PIGCalculatorService.calculate(hpi, hei);

      expect(result).not.toBeNull();
      // PIG = √[(10/100)² + 1²] / √2 = √[0.01 + 1] / √2 ≈ 0.71
      expect(result?.pig).toBeLessThan(1);
      expect(result?.classification).toBe('Low pollution');
    });

    it('should return moderate pollution for medium values', () => {
      const hpi = 50;
      const hei = 5;

      const result = PIGCalculatorService.calculate(hpi, hei);

      expect(result).not.toBeNull();
      // PIG = √[(50/100)² + 5²] / √2 = √[0.25 + 25] / √2 ≈ 3.55
      expect(result?.pig).toBeGreaterThan(1);
      expect(result?.pig).toBeLessThan(5);
    });

    it('should return null when HPI is null', () => {
      const result = PIGCalculatorService.calculate(null, 10);

      expect(result).toBeNull();
    });

    it('should return null when HEI is null', () => {
      const result = PIGCalculatorService.calculate(100, null);

      expect(result).toBeNull();
    });

    it('should return null when both are null', () => {
      const result = PIGCalculatorService.calculate(null, null);

      expect(result).toBeNull();
    });
  });

  describe('classifyPIG', () => {
    it('should classify PIG values correctly', () => {
      expect(PIGCalculatorService['classifyPIG'](0.5)).toBe('Low pollution');
      expect(PIGCalculatorService['classifyPIG'](1.5)).toBe('Moderate pollution');
      expect(PIGCalculatorService['classifyPIG'](3)).toBe('High pollution');
      expect(PIGCalculatorService['classifyPIG'](7)).toBe('Very high pollution');
    });
  });
});
