import { Router, Response } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../../middlewares/auth.middleware';
import validationMiddleware from '../../../middlewares/validation.middleware';
import { ResponseFormatter } from '../../../utils/responseFormatter';
import { asyncHandler } from '../../../utils/controllerHelpers';
import { RequestWithUser } from '../../../interfaces/request.interface';
import { listFormulas } from '../shared/queries';
import { formulaTypes } from '../shared/schema';

/**
 * Query parameters schema for listing formulas
 */
const listFormulasQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
  type: z.enum(formulaTypes).optional(),
  is_default: z
    .string()
    .transform(val => val === 'true')
    .optional(),
  is_active: z
    .string()
    .transform(val => val === 'true')
    .optional(),
  search: z.string().max(100).optional(),
});

type ListFormulasQuery = z.infer<typeof listFormulasQuerySchema>;

/**
 * GET /api/formulas
 * List all formulas with optional filters and pagination
 * 
 * Query parameters:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 10, max: 100)
 * - type: Filter by formula type (hpi, mi, wqi)
 * - is_default: Filter by default status (true/false)
 * - is_active: Filter by active status (true/false)
 * - search: Search by formula name
 */
const handler = asyncHandler(async (req: RequestWithUser, res: Response) => {
  const query = req.query as unknown as ListFormulasQuery;

  const result = await listFormulas(
    {
      type: query.type,
      is_default: query.is_default,
      is_active: query.is_active,
      search: query.search,
    },
    {
      page: query.page || 1,
      limit: query.limit || 10,
    }
  );

  ResponseFormatter.paginated(
    res,
    result.data,
    result.pagination,
    'Formulas retrieved successfully'
  );
});

const router = Router();

router.get(
  '/',
  requireAuth,
  validationMiddleware(listFormulasQuerySchema, 'query'),
  handler
);

export default router;
