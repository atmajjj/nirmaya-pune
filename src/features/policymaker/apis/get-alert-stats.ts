/**
 * GET /api/policymaker/alerts/stats
 * Get alert statistics for dashboard
 * Access: policymaker, admin
 */

import { Router, Response } from 'express';
import { requireAuth } from '../../../middlewares/auth.middleware';
import { requireRole } from '../../../middlewares/role.middleware';
import { ResponseFormatter } from '../../../utils/responseFormatter';
import { asyncHandler } from '../../../utils/controllerHelpers';
import { getAlertStats, getRecentAlerts } from '../shared/queries';
import { AlertStats } from '../shared/interface';

const handler = asyncHandler(async (req, res: Response) => {
  const [stats, recentAlerts] = await Promise.all([
    getAlertStats(),
    getRecentAlerts(10),
  ]);

  const response: AlertStats = {
    ...stats,
    recent_alerts: recentAlerts,
  };

  ResponseFormatter.success(res, response, 'Alert statistics fetched successfully');
});

const router = Router();

router.get(
  '/alerts/stats',
  requireAuth,
  requireRole(['policymaker', 'admin']),
  handler
);

export default router;
