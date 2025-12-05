import {
  Formula,
  FormulaType,
  FormulaParameters,
  ClassificationConfig,
  MetalParameter,
  WQIParameter,
  ClassificationRange,
} from './schema';

/**
 * Interface for formula objects (excludes password-like sensitive fields)
 * This is the canonical type for formula objects in the application
 */
export interface IFormula {
  id: number;
  name: string;
  type: FormulaType;
  description: string | null;
  version: string | null;
  parameters: FormulaParameters;
  classification: ClassificationConfig;
  is_default: boolean;
  is_active: boolean;
  created_by: number;
  created_at: Date;
  updated_by: number | null;
  updated_at: Date | null;
}

/**
 * Input for creating a new formula
 */
export interface CreateFormulaInput {
  name: string;
  type: FormulaType;
  description?: string;
  version?: string;
  parameters: FormulaParameters;
  classification: ClassificationConfig;
  is_default?: boolean;
  is_active?: boolean;
}

/**
 * Input for updating a formula
 */
export interface UpdateFormulaInput {
  name?: string;
  description?: string;
  version?: string;
  parameters?: FormulaParameters;
  classification?: ClassificationConfig;
  is_default?: boolean;
  is_active?: boolean;
}

/**
 * Filter options for listing formulas
 */
export interface FormulaListFilters {
  type?: FormulaType;
  is_default?: boolean;
  is_active?: boolean;
  search?: string; // Search by name
}

/**
 * Pagination options
 */
export interface PaginationOptions {
  page: number;
  limit: number;
}

/**
 * Paginated result
 */
export interface PaginatedFormulas {
  data: IFormula[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Formula with creator information
 */
export interface FormulaWithCreator extends IFormula {
  creator?: {
    id: number;
    name: string;
    email: string;
  };
}

/**
 * Summary of a formula (for dropdown/selection lists)
 */
export interface FormulaSummary {
  id: number;
  name: string;
  type: FormulaType;
  version: string | null;
  is_default: boolean;
  is_active: boolean;
}

/**
 * Re-export types from schema for convenience
 */
export type {
  Formula,
  FormulaType,
  FormulaParameters,
  ClassificationConfig,
  MetalParameter,
  WQIParameter,
  ClassificationRange,
};
