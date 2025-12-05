import { Router, Response } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../../middlewares/auth.middleware';
import validationMiddleware from '../../../middlewares/validation.middleware';
import { ResponseFormatter } from '../../../utils/responseFormatter';
import { asyncHandler } from '../../../utils/controllerHelpers';
import { RequestWithUser } from '../../../interfaces/request.interface';
import { findFormulasByType, findDefaultFormula, getFormulaSummaries } from '../shared/queries';
import { formulaTypes } from '../shared/schema';

/**
 * Path parameters schema
 */
const getFormulasByTypeParamsSchema = z.object({
  type: z.enum(formulaTypes),
});

/**
 * Query parameters schema
 */
const getFormulasByTypeQuerySchema = z.object({
  summary: z
    .string()
    .transform(val => val === 'true')
    .optional(),
  default_only: z
    .string()
    .transform(val => val === 'true')
    .optional(),
});

type GetFormulasByTypeParams = z.infer<typeof getFormulasByTypeParamsSchema>;
type GetFormulasByTypeQuery = z.infer<typeof getFormulasByTypeQuerySchema>;

/**
 * GET /api/formulas/type/:type
 * Get all formulas for a specific type (hpi, mi, wqi)
 * 
 * Query parameters:
 * - summary: If true, return only summary fields (id, name, type, version, is_default)
 * - default_only: If true, return only the default formula for the type
 */
const handler = asyncHandler(async (req: RequestWithUser, res: Response) => {
  const { type } = req.params as unknown as GetFormulasByTypeParams;
  const query = req.query as unknown as GetFormulasByTypeQuery;

  // If requesting only the default formula
  if (query.default_only) {
    const defaultFormula = await findDefaultFormula(type);
    ResponseFormatter.success(
      res,
      defaultFormula,
      defaultFormula
        ? `Default ${type.toUpperCase()} formula retrieved successfully`
        : `No default ${type.toUpperCase()} formula found`
    );
    return;
  }

  // If requesting summaries (for dropdowns)
  if (query.summary) {
    const summaries = await getFormulaSummaries(type);
    ResponseFormatter.success(
      res,
      summaries,
      `${summaries.length} ${type.toUpperCase()} formula summaries retrieved`
    );
    return;
  }

  // Full formula list
  const formulas = await findFormulasByType(type);
  ResponseFormatter.success(
    res,
    formulas,
    `${formulas.length} ${type.toUpperCase()} formulas retrieved successfully`
  );
});

const router = Router();

router.get(
  '/type/:type',
  requireAuth,
  validationMiddleware(getFormulasByTypeParamsSchema, 'params'),
  validationMiddleware(getFormulasByTypeQuerySchema, 'query'),
  handler
);

export default router;
