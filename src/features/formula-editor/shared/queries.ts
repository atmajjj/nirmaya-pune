import { eq, and, ilike, desc, asc, sql, count } from 'drizzle-orm';
import { db } from '../../../database/drizzle';
import { formulas, FormulaType, Formula, NewFormula } from './schema';
import {
  IFormula,
  FormulaListFilters,
  PaginationOptions,
  PaginatedFormulas,
  FormulaSummary,
} from './interface';

/**
 * Convert database formula to IFormula interface
 */
export function toIFormula(formula: Formula): IFormula {
  return {
    id: formula.id,
    name: formula.name,
    type: formula.type,
    description: formula.description,
    version: formula.version,
    parameters: formula.parameters,
    classification: formula.classification,
    is_default: formula.is_default,
    is_active: formula.is_active,
    created_by: formula.created_by,
    created_at: formula.created_at,
    updated_by: formula.updated_by,
    updated_at: formula.updated_at,
  };
}

/**
 * Find formula by ID (active, non-deleted)
 */
export async function findFormulaById(id: number): Promise<IFormula | null> {
  const result = await db
    .select()
    .from(formulas)
    .where(and(eq(formulas.id, id), eq(formulas.is_deleted, false)))
    .limit(1);

  return result.length > 0 ? toIFormula(result[0]) : null;
}

/**
 * Find formula by ID including deleted (for admin purposes)
 */
export async function findFormulaByIdIncludeDeleted(id: number): Promise<IFormula | null> {
  const result = await db.select().from(formulas).where(eq(formulas.id, id)).limit(1);

  return result.length > 0 ? toIFormula(result[0]) : null;
}

/**
 * Find default formula for a given type
 */
export async function findDefaultFormula(type: FormulaType): Promise<IFormula | null> {
  const result = await db
    .select()
    .from(formulas)
    .where(
      and(
        eq(formulas.type, type),
        eq(formulas.is_default, true),
        eq(formulas.is_active, true),
        eq(formulas.is_deleted, false)
      )
    )
    .limit(1);

  return result.length > 0 ? toIFormula(result[0]) : null;
}

/**
 * Find all formulas by type
 */
export async function findFormulasByType(type: FormulaType): Promise<IFormula[]> {
  const result = await db
    .select()
    .from(formulas)
    .where(and(eq(formulas.type, type), eq(formulas.is_active, true), eq(formulas.is_deleted, false)))
    .orderBy(desc(formulas.is_default), asc(formulas.name));

  return result.map(toIFormula);
}

/**
 * List formulas with filters and pagination
 */
export async function listFormulas(
  filters: FormulaListFilters = {},
  pagination: PaginationOptions = { page: 1, limit: 10 }
): Promise<PaginatedFormulas> {
  const { type, is_default, is_active, search } = filters;
  const { page, limit } = pagination;
  const offset = (page - 1) * limit;

  // Build conditions
  const conditions = [eq(formulas.is_deleted, false)];

  if (type) {
    conditions.push(eq(formulas.type, type));
  }
  if (is_default !== undefined) {
    conditions.push(eq(formulas.is_default, is_default));
  }
  if (is_active !== undefined) {
    conditions.push(eq(formulas.is_active, is_active));
  }
  if (search) {
    conditions.push(ilike(formulas.name, `%${search}%`));
  }

  // Get total count
  const countResult = await db
    .select({ count: count() })
    .from(formulas)
    .where(and(...conditions));

  const total = countResult[0]?.count ?? 0;

  // Get paginated data
  const result = await db
    .select()
    .from(formulas)
    .where(and(...conditions))
    .orderBy(desc(formulas.is_default), desc(formulas.created_at))
    .limit(limit)
    .offset(offset);

  return {
    data: result.map(toIFormula),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Get formula summaries (for dropdowns/selection lists)
 */
export async function getFormulaSummaries(type?: FormulaType): Promise<FormulaSummary[]> {
  const conditions = [eq(formulas.is_deleted, false), eq(formulas.is_active, true)];

  if (type) {
    conditions.push(eq(formulas.type, type));
  }

  const result = await db
    .select({
      id: formulas.id,
      name: formulas.name,
      type: formulas.type,
      version: formulas.version,
      is_default: formulas.is_default,
      is_active: formulas.is_active,
    })
    .from(formulas)
    .where(and(...conditions))
    .orderBy(desc(formulas.is_default), asc(formulas.name));

  return result;
}

/**
 * Create a new formula
 */
export async function createFormula(data: NewFormula): Promise<IFormula> {
  const [result] = await db.insert(formulas).values(data).returning();
  return toIFormula(result);
}

/**
 * Update a formula
 */
export async function updateFormula(
  id: number,
  data: Partial<NewFormula>,
  updatedBy: number
): Promise<IFormula | null> {
  const [result] = await db
    .update(formulas)
    .set({
      ...data,
      updated_by: updatedBy,
      updated_at: new Date(),
    })
    .where(and(eq(formulas.id, id), eq(formulas.is_deleted, false)))
    .returning();

  return result ? toIFormula(result) : null;
}

/**
 * Soft delete a formula
 */
export async function deleteFormula(id: number, deletedBy: number): Promise<boolean> {
  const result = await db
    .update(formulas)
    .set({
      is_deleted: true,
      deleted_by: deletedBy,
      deleted_at: new Date(),
    })
    .where(and(eq(formulas.id, id), eq(formulas.is_deleted, false)))
    .returning({ id: formulas.id });

  return result.length > 0;
}

/**
 * Set a formula as default for its type (unsets other defaults)
 */
export async function setDefaultFormula(id: number, updatedBy: number): Promise<IFormula | null> {
  // First, get the formula to know its type
  const formula = await findFormulaById(id);
  if (!formula) return null;

  // Unset all other defaults for this type
  await db
    .update(formulas)
    .set({
      is_default: false,
      updated_by: updatedBy,
      updated_at: new Date(),
    })
    .where(
      and(
        eq(formulas.type, formula.type),
        eq(formulas.is_default, true),
        eq(formulas.is_deleted, false)
      )
    );

  // Set the new default
  return updateFormula(id, { is_default: true }, updatedBy);
}

/**
 * Check if a formula name already exists for a type
 */
export async function formulaNameExists(
  name: string,
  type: FormulaType,
  excludeId?: number
): Promise<boolean> {
  const conditions = [
    eq(formulas.name, name),
    eq(formulas.type, type),
    eq(formulas.is_deleted, false),
  ];

  if (excludeId) {
    conditions.push(sql`${formulas.id} != ${excludeId}`);
  }

  const result = await db
    .select({ id: formulas.id })
    .from(formulas)
    .where(and(...conditions))
    .limit(1);

  return result.length > 0;
}

/**
 * Duplicate a formula with a new name
 */
export async function duplicateFormula(
  id: number,
  newName: string,
  createdBy: number
): Promise<IFormula | null> {
  const original = await findFormulaById(id);
  if (!original) return null;

  const newFormula: NewFormula = {
    name: newName,
    type: original.type,
    description: original.description ? `Copy of: ${original.description}` : `Copy of ${original.name}`,
    version: original.version,
    parameters: original.parameters,
    classification: original.classification,
    is_default: false, // Duplicates are never default
    is_active: true,
    created_by: createdBy,
  };

  return createFormula(newFormula);
}
