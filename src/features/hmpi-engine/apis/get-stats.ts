/**
 * GET /api/hmpi-engine/stats
 * Get water quality calculation statistics
 * 
 * Requires: auth + role (admin, scientist, policymaker)
 * 
 * Query params:
 * - state: Filter by state
 * - date_from: Filter by start date (ISO format)
 * - date_to: Filter by end date (ISO format)
 */

import { Router, Response, Request } from 'express';
import { z } from 'zod';
import '../../../interfaces/request.interface';
import { requireAuth } from '../../../middlewares/auth.middleware';
import { requireRole } from '../../../middlewares/role.middleware';
import { ResponseFormatter } from '../../../utils/responseFormatter';
import { asyncHandler } from '../../../utils/controllerHelpers';
import { getCalculationStats } from '../shared/queries';

// Query parameter schema
const querySchema = z.object({
  state: z.string().optional(),
  date_from: z.string().datetime().optional(),
  date_to: z.string().datetime().optional(),
});

const handler = asyncHandler(async (req: Request, res: Response) => {
  // Parse and validate query parameters
  const query = querySchema.parse(req.query);

  // Build params
  const params: {
    state?: string;
    dateFrom?: Date;
    dateTo?: Date;
  } = {};

  if (query.state) params.state = query.state;
  if (query.date_from) params.dateFrom = new Date(query.date_from);
  if (query.date_to) params.dateTo = new Date(query.date_to);

  // Get statistics
  const stats = await getCalculationStats(params);

  ResponseFormatter.success(res, stats, 'Statistics retrieved successfully');
});

const router = Router();

// GET /api/hmpi-engine/stats
router.get(
  '/stats',
  requireAuth,
  requireRole(['admin', 'scientist', 'policymaker']),
  handler
);

export default router;
