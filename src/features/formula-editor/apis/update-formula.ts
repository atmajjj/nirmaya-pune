import { Router, Response } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../../middlewares/auth.middleware';
import { requireRole } from '../../../middlewares/role.middleware';
import validationMiddleware from '../../../middlewares/validation.middleware';
import { ResponseFormatter } from '../../../utils/responseFormatter';
import { asyncHandler } from '../../../utils/controllerHelpers';
import HttpException from '../../../utils/httpException';
import { RequestWithUser } from '../../../interfaces/request.interface';
import { findFormulaById, updateFormula, formulaNameExists } from '../shared/queries';

/**
 * Path parameters schema
 */
const updateFormulaParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

/**
 * Zod schema for metal parameter (HPI/MI)
 */
const metalParameterSchema = z.object({
  symbol: z.string().min(1).max(10),
  name: z.string().min(1).max(100),
  Si: z.number().positive(),
  Ii: z.number().min(0),
  MAC: z.number().positive(),
});

/**
 * Zod schema for WQI parameter
 */
const wqiParameterSchema = z.object({
  symbol: z.string().min(1).max(20),
  name: z.string().min(1).max(100),
  Sn: z.number(),
  Vo: z.number(),
  unit: z.string().max(20),
});

/**
 * Classification range schema
 */
const classificationRangeSchema = z.object({
  min: z.number().optional(),
  max: z.number().optional(),
  label: z.string().min(1).max(100),
  severity: z.number().int().min(1),
  description: z.string().max(500).optional(),
});

/**
 * Update formula request schema (all fields optional)
 */
const updateFormulaSchema = z.object({
  name: z.string().min(1).max(255).trim().optional(),
  description: z.string().max(1000).optional().nullable(),
  version: z.string().max(50).optional().nullable(),
  parameters: z.record(z.string(), z.union([metalParameterSchema, wqiParameterSchema])).optional(),
  classification: z
    .object({
      ranges: z.array(classificationRangeSchema).min(1),
    })
    .optional(),
  is_active: z.boolean().optional(),
});

type UpdateFormulaParams = z.infer<typeof updateFormulaParamsSchema>;
type UpdateFormulaBody = z.infer<typeof updateFormulaSchema>;

/**
 * PUT /api/formulas/:id
 * Update an existing formula
 * 
 * Required role: admin or scientist
 * Note: Cannot change formula type or is_default via this endpoint
 */
const handler = asyncHandler(async (req: RequestWithUser, res: Response) => {
  const userId = req.userId!;
  const { id } = req.params as unknown as UpdateFormulaParams;
  const body = req.body as UpdateFormulaBody;

  // Check if formula exists
  const existing = await findFormulaById(id);
  if (!existing) {
    throw new HttpException(404, `Formula with ID ${id} not found`);
  }

  // If name is being changed, check for duplicates
  if (body.name && body.name !== existing.name) {
    const nameExists = await formulaNameExists(body.name, existing.type, id);
    if (nameExists) {
      throw new HttpException(
        409,
        `Formula with name "${body.name}" already exists for type "${existing.type}"`
      );
    }
  }

  // Validate parameters match formula type if provided
  if (body.parameters) {
    validateParametersForType(existing.type, body.parameters);
  }

  // Build update data
  const updateData: Record<string, unknown> = {};
  if (body.name !== undefined) updateData.name = body.name;
  if (body.description !== undefined) updateData.description = body.description;
  if (body.version !== undefined) updateData.version = body.version;
  if (body.parameters !== undefined) updateData.parameters = body.parameters;
  if (body.classification !== undefined) updateData.classification = body.classification;
  if (body.is_active !== undefined) updateData.is_active = body.is_active;

  // Update formula
  const updated = await updateFormula(id, updateData, userId);

  ResponseFormatter.success(res, updated, 'Formula updated successfully');
});

/**
 * Validate that parameters match the formula type
 */
function validateParametersForType(
  type: string,
  parameters: Record<string, unknown>
): void {
  const paramKeys = Object.keys(parameters);
  
  if (paramKeys.length === 0) {
    throw new HttpException(400, 'At least one parameter is required');
  }

  for (const [key, param] of Object.entries(parameters)) {
    const p = param as Record<string, unknown>;
    
    if (type === 'wqi') {
      if (typeof p.Sn !== 'number' || typeof p.Vo !== 'number') {
        throw new HttpException(
          400,
          `WQI parameter "${key}" must have Sn and Vo numeric values`
        );
      }
    } else {
      if (typeof p.Si !== 'number' || typeof p.Ii !== 'number' || typeof p.MAC !== 'number') {
        throw new HttpException(
          400,
          `Metal parameter "${key}" must have Si, Ii, and MAC numeric values`
        );
      }
    }
  }
}

const router = Router();

router.put(
  '/:id',
  requireAuth,
  requireRole(['admin', 'scientist']),
  validationMiddleware(updateFormulaParamsSchema, 'params'),
  validationMiddleware(updateFormulaSchema),
  handler
);

export default router;
