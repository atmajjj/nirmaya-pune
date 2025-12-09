/**
 * POST /api/policymaker/alerts/generate
 * Generate alerts for an upload (admin only)
 * Access: admin
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../../middlewares/auth.middleware';
import { requireRole } from '../../../middlewares/role.middleware';
import validationMiddleware from '../../../middlewares/validation.middleware';
import { ResponseFormatter } from '../../../utils/responseFormatter';
import { asyncHandler } from '../../../utils/controllerHelpers';
import { AlertGeneratorService } from '../services/alert-generator.service';
import { RequestWithUser } from '../../../interfaces/request.interface';

const bodySchema = z.object({
  upload_id: z.number().int().positive().optional(),
  regenerate_all: z.boolean().optional().default(false),
  thresholds: z.object({
    hpi: z.object({
      safe: z.number().positive(),
      moderate: z.number().positive(),
    }),
    mi: z.object({
      safe: z.number().positive(),
      moderate: z.number().positive(),
    }),
  }).optional(),
});

const handler = asyncHandler(async (req: RequestWithUser, res: Response) => {
  const { upload_id, regenerate_all, thresholds } = bodySchema.parse(req.body);
  const userId = req.userId;

  let result: { generated: number; skipped?: number; total_calculations?: number };

  if (regenerate_all) {
    result = await AlertGeneratorService.regenerateAllAlerts(userId, thresholds);
    ResponseFormatter.success(res, result, 'All alerts regenerated successfully');
  } else if (upload_id) {
    result = await AlertGeneratorService.generateAlertsForUpload(upload_id, userId, thresholds);
    ResponseFormatter.success(res, result, `Alerts generated for upload ${upload_id}`);
  } else {
    ResponseFormatter.success(res, { message: 'No action taken. Provide upload_id or set regenerate_all to true.' }, 'No alerts generated');
  }
});

const router = Router();

router.post(
  '/alerts/generate',
  requireAuth,
  requireRole(['admin']),
  validationMiddleware(bodySchema),
  handler
);

export default router;
