import { Router, Response } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../../middlewares/auth.middleware';
import { requireRole } from '../../../middlewares/role.middleware';
import validationMiddleware from '../../../middlewares/validation.middleware';
import { ResponseFormatter } from '../../../utils/responseFormatter';
import { asyncHandler } from '../../../utils/controllerHelpers';
import HttpException from '../../../utils/httpException';
import { RequestWithUser } from '../../../interfaces/request.interface';
import { findFormulaById, deleteFormula } from '../shared/queries';

/**
 * Path parameters schema
 */
const deleteFormulaParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

type DeleteFormulaParams = z.infer<typeof deleteFormulaParamsSchema>;

/**
 * DELETE /api/formulas/:id
 * Soft delete a formula
 * 
 * Required role: admin only
 * Note: Default formulas cannot be deleted
 */
const handler = asyncHandler(async (req: RequestWithUser, res: Response) => {
  const userId = req.userId!;
  const { id } = req.params as unknown as DeleteFormulaParams;

  // Check if formula exists
  const existing = await findFormulaById(id);
  if (!existing) {
    throw new HttpException(404, `Formula with ID ${id} not found`);
  }

  // Prevent deletion of default formulas
  if (existing.is_default) {
    throw new HttpException(
      400,
      'Cannot delete the default formula. Set another formula as default first.'
    );
  }

  // Soft delete
  const deleted = await deleteFormula(id, userId);
  if (!deleted) {
    throw new HttpException(500, 'Failed to delete formula');
  }

  ResponseFormatter.noContent(res);
});

const router = Router();

router.delete(
  '/:id',
  requireAuth,
  requireRole('admin'),
  validationMiddleware(deleteFormulaParamsSchema, 'params'),
  handler
);

export default router;
