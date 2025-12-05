import { Router, Response } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../../middlewares/auth.middleware';
import { requireRole } from '../../../middlewares/role.middleware';
import validationMiddleware from '../../../middlewares/validation.middleware';
import { ResponseFormatter } from '../../../utils/responseFormatter';
import { asyncHandler } from '../../../utils/controllerHelpers';
import HttpException from '../../../utils/httpException';
import { RequestWithUser } from '../../../interfaces/request.interface';
import { createFormula, formulaNameExists } from '../shared/queries';
import { formulaTypes } from '../shared/schema';

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
 * Create formula request schema
 */
const createFormulaSchema = z.object({
  name: z.string().min(1).max(255).trim(),
  type: z.enum(formulaTypes),
  description: z.string().max(1000).optional(),
  version: z.string().max(50).optional(),
  parameters: z.record(z.string(), z.union([metalParameterSchema, wqiParameterSchema])),
  classification: z.object({
    ranges: z.array(classificationRangeSchema).min(1),
  }),
  is_default: z.boolean().optional().default(false),
  is_active: z.boolean().optional().default(true),
});

type CreateFormulaBody = z.infer<typeof createFormulaSchema>;

/**
 * POST /api/formulas
 * Create a new formula
 * 
 * Required role: admin or scientist
 */
const handler = asyncHandler(async (req: RequestWithUser, res: Response) => {
  const userId = req.userId!;
  const body = req.body as CreateFormulaBody;

  // Check if formula name already exists for this type
  const nameExists = await formulaNameExists(body.name, body.type);
  if (nameExists) {
    throw new HttpException(409, `Formula with name "${body.name}" already exists for type "${body.type}"`);
  }

  // Validate parameters match formula type
  validateParametersForType(body.type, body.parameters);

  // Create formula
  const formula = await createFormula({
    name: body.name,
    type: body.type,
    description: body.description || null,
    version: body.version || null,
    parameters: body.parameters,
    classification: body.classification,
    is_default: body.is_default,
    is_active: body.is_active,
    created_by: userId,
  });

  ResponseFormatter.created(res, formula, 'Formula created successfully');
});

/**
 * Validate that parameters match the formula type
 * - HPI/MI formulas should have metal parameters (Si, Ii, MAC)
 * - WQI formulas should have WQI parameters (Sn, Vo, unit)
 */
function validateParametersForType(
  type: typeof formulaTypes[number],
  parameters: Record<string, unknown>
): void {
  const paramKeys = Object.keys(parameters);
  
  if (paramKeys.length === 0) {
    throw new HttpException(400, 'At least one parameter is required');
  }

  for (const [key, param] of Object.entries(parameters)) {
    const p = param as Record<string, unknown>;
    
    if (type === 'wqi') {
      // WQI parameters must have Sn and Vo
      if (typeof p.Sn !== 'number' || typeof p.Vo !== 'number') {
        throw new HttpException(
          400,
          `WQI parameter "${key}" must have Sn and Vo numeric values`
        );
      }
    } else {
      // HPI/MI parameters must have Si, Ii, and MAC
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

router.post(
  '/',
  requireAuth,
  requireRole(['admin', 'scientist']),
  validationMiddleware(createFormulaSchema),
  handler
);

export default router;
