import { Router, Response } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../../middlewares/auth.middleware';
import { requireRole } from '../../../middlewares/role.middleware';
import validationMiddleware from '../../../middlewares/validation.middleware';
import { ResponseFormatter } from '../../../utils/responseFormatter';
import { asyncHandler } from '../../../utils/controllerHelpers';
import HttpException from '../../../utils/httpException';
import { RequestWithUser } from '../../../interfaces/request.interface';
import { findFormulaById, setDefaultFormula } from '../shared/queries';

/**
 * Path parameters schema
 */
const setDefaultFormulaParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

type SetDefaultFormulaParams = z.infer<typeof setDefaultFormulaParamsSchema>;

/**
 * POST /api/formulas/:id/set-default
 * Set a formula as the default for its type
 * 
 * Required role: admin only
 * Note: Only active formulas can be set as default
 */
const handler = asyncHandler(async (req: RequestWithUser, res: Response) => {
  const userId = req.userId!;
  const { id } = req.params as unknown as SetDefaultFormulaParams;

  // Check if formula exists
  const existing = await findFormulaById(id);
  if (!existing) {
    throw new HttpException(404, `Formula with ID ${id} not found`);
  }

  // Check if formula is active
  if (!existing.is_active) {
    throw new HttpException(400, 'Cannot set an inactive formula as default');
  }

  // Already default?
  if (existing.is_default) {
    ResponseFormatter.success(res, existing, 'Formula is already the default');
    return;
  }

  // Set as default (this will unset other defaults for the same type)
  const updated = await setDefaultFormula(id, userId);

  ResponseFormatter.success(
    res,
    updated,
    `Formula set as default for ${existing.type.toUpperCase()} calculations`
  );
});

const router = Router();

router.post(
  '/:id/set-default',
  requireAuth,
  requireRole('admin'),
  validationMiddleware(setDefaultFormulaParamsSchema, 'params'),
  handler
);

export default router;
