/**
 * Test fixtures for Formula Editor integration tests
 */

import { FormulaType, FormulaParameters, ClassificationConfig } from '../../shared/schema';

/**
 * API paths for formula endpoints
 */
export const API_PATHS = {
  formulas: '/api/formulas',
  formulaById: (id: number) => `/api/formulas/${id}`,
  formulasByType: (type: FormulaType) => `/api/formulas/type/${type}`,
  setDefault: (id: number) => `/api/formulas/${id}/set-default`,
  duplicate: (id: number) => `/api/formulas/${id}/duplicate`,
};

/**
 * Sample HPI formula for testing
 */
export const SAMPLE_HPI_FORMULA = {
  name: 'Test HPI Formula',
  type: 'hpi' as FormulaType,
  description: 'Test HPI formula for integration tests',
  version: 'Test v1.0',
  parameters: {
    As: { symbol: 'As', name: 'Arsenic', Si: 50, Ii: 10, MAC: 50 },
    Cu: { symbol: 'Cu', name: 'Copper', Si: 1500, Ii: 50, MAC: 1500 },
    Pb: { symbol: 'Pb', name: 'Lead', Si: 10, Ii: 0, MAC: 10 },
  } as FormulaParameters,
  classification: {
    ranges: [
      { max: 25, label: 'Low pollution', severity: 1 },
      { min: 25, max: 50, label: 'Medium pollution', severity: 2 },
      { min: 50, label: 'High pollution', severity: 3 },
    ],
  } as ClassificationConfig,
  is_default: false,
  is_active: true,
};

/**
 * Sample MI formula for testing
 */
export const SAMPLE_MI_FORMULA = {
  name: 'Test MI Formula',
  type: 'mi' as FormulaType,
  description: 'Test MI formula for integration tests',
  version: 'Test v1.0',
  parameters: {
    As: { symbol: 'As', name: 'Arsenic', Si: 50, Ii: 10, MAC: 50 },
    Cd: { symbol: 'Cd', name: 'Cadmium', Si: 5, Ii: 3, MAC: 3 },
  } as FormulaParameters,
  classification: {
    ranges: [
      { max: 0.3, label: 'Very pure', severity: 1 },
      { min: 0.3, max: 1, label: 'Pure', severity: 2 },
      { min: 1, label: 'Affected', severity: 3 },
    ],
  } as ClassificationConfig,
  is_default: false,
  is_active: true,
};

/**
 * Sample WQI formula for testing
 */
export const SAMPLE_WQI_FORMULA = {
  name: 'Test WQI Formula',
  type: 'wqi' as FormulaType,
  description: 'Test WQI formula for integration tests',
  version: 'Test v1.0',
  parameters: {
    pH: { symbol: 'pH', name: 'pH', Sn: 8.5, Vo: 7, unit: '' },
    TDS: { symbol: 'TDS', name: 'Total Dissolved Solids', Sn: 500, Vo: 0, unit: 'mg/L' },
  } as FormulaParameters,
  classification: {
    ranges: [
      { max: 25, label: 'Excellent', severity: 1 },
      { min: 25, max: 50, label: 'Good', severity: 2 },
      { min: 50, label: 'Poor', severity: 3 },
    ],
  } as ClassificationConfig,
  is_default: false,
  is_active: true,
};

/**
 * Invalid formula data for testing validation
 */
export const INVALID_FORMULAS = {
  missingName: {
    type: 'hpi' as FormulaType,
    parameters: SAMPLE_HPI_FORMULA.parameters,
    classification: SAMPLE_HPI_FORMULA.classification,
  },
  missingType: {
    name: 'Test Formula',
    parameters: SAMPLE_HPI_FORMULA.parameters,
    classification: SAMPLE_HPI_FORMULA.classification,
  },
  invalidType: {
    name: 'Test Formula',
    type: 'invalid' as FormulaType,
    parameters: SAMPLE_HPI_FORMULA.parameters,
    classification: SAMPLE_HPI_FORMULA.classification,
  },
  emptyParameters: {
    name: 'Test Formula',
    type: 'hpi' as FormulaType,
    parameters: {},
    classification: SAMPLE_HPI_FORMULA.classification,
  },
  emptyClassification: {
    name: 'Test Formula',
    type: 'hpi' as FormulaType,
    parameters: SAMPLE_HPI_FORMULA.parameters,
    classification: { ranges: [] },
  },
  wqiParametersWithMetalType: {
    name: 'Test Formula',
    type: 'hpi' as FormulaType,
    parameters: SAMPLE_WQI_FORMULA.parameters, // WQI params for HPI type
    classification: SAMPLE_HPI_FORMULA.classification,
  },
};

/**
 * Update formula payloads
 */
export const UPDATE_PAYLOADS = {
  nameOnly: {
    name: 'Updated Formula Name',
  },
  descriptionOnly: {
    description: 'Updated description',
  },
  parametersOnly: {
    parameters: {
      As: { symbol: 'As', name: 'Arsenic', Si: 60, Ii: 15, MAC: 60 },
    },
  },
  classificationOnly: {
    classification: {
      ranges: [
        { max: 30, label: 'Updated Low', severity: 1 },
        { min: 30, label: 'Updated High', severity: 2 },
      ],
    },
  },
  isActiveOnly: {
    is_active: false,
  },
};
