import { Router, Response } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../../middlewares/auth.middleware';
import validationMiddleware from '../../../middlewares/validation.middleware';
import { ResponseFormatter } from '../../../utils/responseFormatter';
import { asyncHandler } from '../../../utils/controllerHelpers';
import HttpException from '../../../utils/httpException';
import { RequestWithUser } from '../../../interfaces/request.interface';
import { findFormulaById } from '../shared/queries';

/**
 * Path parameters schema
 */
const getFormulaParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

type GetFormulaParams = z.infer<typeof getFormulaParamsSchema>;

/**
 * GET /api/formulas/:id
 * Get a single formula by ID
 */
const handler = asyncHandler(async (req: RequestWithUser, res: Response) => {
  const { id } = req.params as unknown as GetFormulaParams;

  const formula = await findFormulaById(id);

  if (!formula) {
    throw new HttpException(404, `Formula with ID ${id} not found`);
  }

  ResponseFormatter.success(res, formula, 'Formula retrieved successfully');
});

const router = Router();

router.get(
  '/:id',
  requireAuth,
  validationMiddleware(getFormulaParamsSchema, 'params'),
  handler
);

export default router;
