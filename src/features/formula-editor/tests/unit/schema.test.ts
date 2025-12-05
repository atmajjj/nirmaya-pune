/**
 * Unit tests for Formula Editor Schema and Queries
 * Tests the query functions with mocked database
 */

import { toIFormula } from '../../shared/queries';
import { Formula, FormulaType, FormulaParameters, ClassificationConfig } from '../../shared/schema';

describe('Formula Editor - toIFormula', () => {
  const mockFormula: Formula = {
    id: 1,
    name: 'Test HPI Formula',
    type: 'hpi' as FormulaType,
    description: 'Test description',
    version: 'v1.0',
    parameters: {
      As: { symbol: 'As', name: 'Arsenic', Si: 50, Ii: 10, MAC: 50 },
      Cu: { symbol: 'Cu', name: 'Copper', Si: 1500, Ii: 50, MAC: 1500 },
    } as FormulaParameters,
    classification: {
      ranges: [
        { max: 25, label: 'Low pollution', severity: 1 },
        { min: 25, max: 50, label: 'Medium pollution', severity: 2 },
        { min: 50, label: 'High pollution', severity: 3 },
      ],
    } as ClassificationConfig,
    is_default: true,
    is_active: true,
    created_by: 1,
    created_at: new Date('2024-01-01'),
    updated_by: null,
    updated_at: null,
    is_deleted: false,
    deleted_by: null,
    deleted_at: null,
  };

  it('should convert Formula to IFormula correctly', () => {
    const result = toIFormula(mockFormula);

    expect(result.id).toBe(1);
    expect(result.name).toBe('Test HPI Formula');
    expect(result.type).toBe('hpi');
    expect(result.description).toBe('Test description');
    expect(result.version).toBe('v1.0');
    expect(result.is_default).toBe(true);
    expect(result.is_active).toBe(true);
    expect(result.created_by).toBe(1);
    expect(result.updated_by).toBeNull();
    expect(result.updated_at).toBeNull();
  });

  it('should preserve parameters structure', () => {
    const result = toIFormula(mockFormula);

    expect(result.parameters).toHaveProperty('As');
    expect(result.parameters).toHaveProperty('Cu');
    expect((result.parameters as Record<string, { Si: number }>).As.Si).toBe(50);
  });

  it('should preserve classification structure', () => {
    const result = toIFormula(mockFormula);

    expect(result.classification.ranges).toHaveLength(3);
    expect(result.classification.ranges[0].label).toBe('Low pollution');
    expect(result.classification.ranges[0].severity).toBe(1);
  });
});

describe('Formula Types', () => {
  it('should have valid formula types', () => {
    const validTypes: FormulaType[] = ['hpi', 'mi', 'wqi'];
    
    expect(validTypes).toContain('hpi');
    expect(validTypes).toContain('mi');
    expect(validTypes).toContain('wqi');
  });
});

describe('Classification Config Validation', () => {
  it('should support ranges with only max value (first range)', () => {
    const config: ClassificationConfig = {
      ranges: [
        { max: 25, label: 'Excellent', severity: 1 },
      ],
    };

    expect(config.ranges[0].min).toBeUndefined();
    expect(config.ranges[0].max).toBe(25);
  });

  it('should support ranges with only min value (last range)', () => {
    const config: ClassificationConfig = {
      ranges: [
        { min: 100, label: 'Critical', severity: 5 },
      ],
    };

    expect(config.ranges[0].min).toBe(100);
    expect(config.ranges[0].max).toBeUndefined();
  });

  it('should support ranges with both min and max', () => {
    const config: ClassificationConfig = {
      ranges: [
        { min: 25, max: 50, label: 'Medium', severity: 2 },
      ],
    };

    expect(config.ranges[0].min).toBe(25);
    expect(config.ranges[0].max).toBe(50);
  });

  it('should support optional description in ranges', () => {
    const config: ClassificationConfig = {
      ranges: [
        { max: 25, label: 'Excellent', severity: 1, description: 'Safe for drinking' },
      ],
    };

    expect(config.ranges[0].description).toBe('Safe for drinking');
  });
});

describe('Metal Parameter Structure', () => {
  it('should have required HPI/MI fields', () => {
    const metalParam = {
      symbol: 'As',
      name: 'Arsenic',
      Si: 50,
      Ii: 10,
      MAC: 50,
    };

    expect(metalParam).toHaveProperty('symbol');
    expect(metalParam).toHaveProperty('name');
    expect(metalParam).toHaveProperty('Si');
    expect(metalParam).toHaveProperty('Ii');
    expect(metalParam).toHaveProperty('MAC');
  });
});

describe('WQI Parameter Structure', () => {
  it('should have required WQI fields', () => {
    const wqiParam = {
      symbol: 'pH',
      name: 'pH',
      Sn: 8.5,
      Vo: 7,
      unit: '',
    };

    expect(wqiParam).toHaveProperty('symbol');
    expect(wqiParam).toHaveProperty('name');
    expect(wqiParam).toHaveProperty('Sn');
    expect(wqiParam).toHaveProperty('Vo');
    expect(wqiParam).toHaveProperty('unit');
  });
});
