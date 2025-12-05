import { Router, Response } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../../middlewares/auth.middleware';
import { requireRole } from '../../../middlewares/role.middleware';
import validationMiddleware from '../../../middlewares/validation.middleware';
import { ResponseFormatter } from '../../../utils/responseFormatter';
import { asyncHandler } from '../../../utils/controllerHelpers';
import HttpException from '../../../utils/httpException';
import { RequestWithUser } from '../../../interfaces/request.interface';
import { findFormulaById, duplicateFormula, formulaNameExists } from '../shared/queries';

/**
 * Path parameters schema
 */
const duplicateFormulaParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

/**
 * Request body schema
 */
const duplicateFormulaBodySchema = z.object({
  name: z.string().min(1).max(255).trim(),
});

type DuplicateFormulaParams = z.infer<typeof duplicateFormulaParamsSchema>;
type DuplicateFormulaBody = z.infer<typeof duplicateFormulaBodySchema>;

/**
 * POST /api/formulas/:id/duplicate
 * Create a copy of an existing formula with a new name
 * 
 * Required role: admin or scientist
 */
const handler = asyncHandler(async (req: RequestWithUser, res: Response) => {
  const userId = req.userId!;
  const { id } = req.params as unknown as DuplicateFormulaParams;
  const { name } = req.body as DuplicateFormulaBody;

  // Check if source formula exists
  const existing = await findFormulaById(id);
  if (!existing) {
    throw new HttpException(404, `Formula with ID ${id} not found`);
  }

  // Check if new name already exists for this type
  const nameExists = await formulaNameExists(name, existing.type);
  if (nameExists) {
    throw new HttpException(
      409,
      `Formula with name "${name}" already exists for type "${existing.type}"`
    );
  }

  // Duplicate the formula
  const duplicated = await duplicateFormula(id, name, userId);
  if (!duplicated) {
    throw new HttpException(500, 'Failed to duplicate formula');
  }

  ResponseFormatter.created(res, duplicated, 'Formula duplicated successfully');
});

const router = Router();

router.post(
  '/:id/duplicate',
  requireAuth,
  requireRole(['admin', 'scientist']),
  validationMiddleware(duplicateFormulaParamsSchema, 'params'),
  validationMiddleware(duplicateFormulaBodySchema),
  handler
);

export default router;
