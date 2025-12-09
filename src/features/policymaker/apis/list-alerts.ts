/**
 * GET /api/policymaker/alerts
 * List alerts with filters and pagination
 * Access: policymaker, admin
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../../middlewares/auth.middleware';
import { requireRole } from '../../../middlewares/role.middleware';
import { ResponseFormatter } from '../../../utils/responseFormatter';
import { asyncHandler } from '../../../utils/controllerHelpers';
import { findAlerts } from '../shared/queries';
import { alertSeverities, alertStatuses, alertTypes, riskLevels } from '../shared/schema';

const querySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  severity: z.enum(alertSeverities).optional(),
  status: z.enum(alertStatuses).optional(),
  alert_type: z.enum(alertTypes).optional(),
  risk_level: z.enum(riskLevels).optional(),
  state: z.string().optional(),
  district: z.string().optional(),
  sort_by: z.enum(['created_at', 'severity', 'risk_level', 'state']).optional().default('created_at'),
  sort_order: z.enum(['asc', 'desc']).optional().default('desc'),
});

const handler = asyncHandler(async (req, res: Response) => {
  const params = querySchema.parse(req.query);

  const { alerts, total } = await findAlerts(params);

  ResponseFormatter.paginated(
    res,
    alerts,
    {
      page: params.page,
      limit: params.limit,
      total,
    },
    'Alerts fetched successfully'
  );
});

const router = Router();

router.get(
  '/alerts',
  requireAuth,
  requireRole(['policymaker', 'admin']),
  handler
);

export default router;
