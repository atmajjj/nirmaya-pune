/**
 * Unit tests for Formula Service
 * Tests the formula service functions with mocked database
 */

import { createClassificationFunction } from './test-helpers';

describe('Formula Service - Classification Function', () => {
  describe('createClassificationFunction', () => {
    it('should classify values correctly based on ranges', () => {
      const ranges = [
        { max: 25, label: 'Excellent', severity: 1 },
        { min: 25, max: 50, label: 'Good', severity: 2 },
        { min: 50, max: 75, label: 'Poor', severity: 3 },
        { min: 75, max: 100, label: 'Very Poor', severity: 4 },
        { min: 100, label: 'Critical', severity: 5 },
      ];

      const classify = createClassificationFunction(ranges);

      expect(classify(10)).toBe('Excellent');
      expect(classify(25)).toBe('Excellent'); // Edge case - max inclusive
      expect(classify(30)).toBe('Good');
      expect(classify(60)).toBe('Poor');
      expect(classify(90)).toBe('Very Poor');
      expect(classify(150)).toBe('Critical');
    });

    it('should handle negative values', () => {
      const ranges = [
        { max: 0, label: 'Negative', severity: 1 },
        { min: 0, label: 'Positive', severity: 2 },
      ];

      const classify = createClassificationFunction(ranges);

      expect(classify(-10)).toBe('Negative');
      expect(classify(0)).toBe('Negative'); // max inclusive
      expect(classify(10)).toBe('Positive');
    });

    it('should handle decimal values', () => {
      const ranges = [
        { max: 0.3, label: 'Very pure', severity: 1 },
        { min: 0.3, max: 1, label: 'Pure', severity: 2 },
        { min: 1, label: 'Affected', severity: 3 },
      ];

      const classify = createClassificationFunction(ranges);

      expect(classify(0.1)).toBe('Very pure');
      expect(classify(0.5)).toBe('Pure');
      expect(classify(2.5)).toBe('Affected');
    });

    it('should return last label for values exceeding all ranges', () => {
      const ranges = [
        { max: 25, label: 'Low', severity: 1 },
        { min: 25, max: 50, label: 'Medium', severity: 2 },
      ];

      const classify = createClassificationFunction(ranges);

      // Value 100 exceeds max range (50), should return last label
      expect(classify(100)).toBe('Medium');
    });

    it('should handle single range', () => {
      const ranges = [
        { label: 'All values', severity: 1 },
      ];

      const classify = createClassificationFunction(ranges);

      expect(classify(0)).toBe('All values');
      expect(classify(100)).toBe('All values');
      expect(classify(-50)).toBe('All values');
    });

    it('should handle unsorted ranges', () => {
      // Ranges provided out of order
      const ranges = [
        { min: 50, label: 'High', severity: 3 },
        { max: 25, label: 'Low', severity: 1 },
        { min: 25, max: 50, label: 'Medium', severity: 2 },
      ];

      const classify = createClassificationFunction(ranges);

      // Should still work correctly after internal sorting
      expect(classify(10)).toBe('Low');
      expect(classify(35)).toBe('Medium');
      expect(classify(70)).toBe('High');
    });
  });
});

describe('Formula Service - HPI Classification', () => {
  it('should match HPI seed data classification', () => {
    const ranges = [
      { max: 25, label: 'Low pollution', severity: 1 },
      { min: 25, max: 50, label: 'Medium pollution', severity: 2 },
      { min: 50, max: 75, label: 'High pollution', severity: 3 },
      { min: 75, max: 100, label: 'Very high pollution', severity: 4 },
      { min: 100, label: 'Critical pollution', severity: 5 },
    ];

    const classify = createClassificationFunction(ranges);

    expect(classify(20)).toBe('Low pollution');
    expect(classify(40)).toBe('Medium pollution');
    expect(classify(60)).toBe('High pollution');
    expect(classify(85)).toBe('Very high pollution');
    expect(classify(120)).toBe('Critical pollution');
  });
});

describe('Formula Service - MI Classification', () => {
  it('should match MI seed data classification', () => {
    const ranges = [
      { max: 0.3, label: 'Very pure', severity: 1 },
      { min: 0.3, max: 1, label: 'Pure', severity: 2 },
      { min: 1, max: 2, label: 'Slightly affected', severity: 3 },
      { min: 2, max: 4, label: 'Moderately affected', severity: 4 },
      { min: 4, max: 6, label: 'Strongly affected', severity: 5 },
      { min: 6, label: 'Seriously affected', severity: 6 },
    ];

    const classify = createClassificationFunction(ranges);

    expect(classify(0.1)).toBe('Very pure');
    expect(classify(0.5)).toBe('Pure');
    expect(classify(1.5)).toBe('Slightly affected');
    expect(classify(3)).toBe('Moderately affected');
    expect(classify(5)).toBe('Strongly affected');
    expect(classify(10)).toBe('Seriously affected');
  });
});

describe('Formula Service - WQI Classification', () => {
  it('should match WQI seed data classification', () => {
    const ranges = [
      { max: 25, label: 'Excellent', severity: 1 },
      { min: 25, max: 50, label: 'Good', severity: 2 },
      { min: 50, max: 75, label: 'Poor', severity: 3 },
      { min: 75, max: 100, label: 'Very Poor', severity: 4 },
      { min: 100, label: 'Unfit for consumption', severity: 5 },
    ];

    const classify = createClassificationFunction(ranges);

    expect(classify(15)).toBe('Excellent');
    expect(classify(35)).toBe('Good');
    expect(classify(60)).toBe('Poor');
    expect(classify(85)).toBe('Very Poor');
    expect(classify(150)).toBe('Unfit for consumption');
  });
});
