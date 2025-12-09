/**
 * PATCH /api/policymaker/alerts/:id/acknowledge
 * Acknowledge an alert
 * Access: policymaker, admin
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../../middlewares/auth.middleware';
import { requireRole } from '../../../middlewares/role.middleware';
import validationMiddleware from '../../../middlewares/validation.middleware';
import { ResponseFormatter } from '../../../utils/responseFormatter';
import { asyncHandler } from '../../../utils/controllerHelpers';
import HttpException from '../../../utils/httpException';
import { findAlertById, updateAlertStatus } from '../shared/queries';
import { convertAlertToResponse } from '../shared/interface';
import { RequestWithUser } from '../../../interfaces/request.interface';

const paramsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const bodySchema = z.object({
  notes: z.string().optional(),
});

const handler = asyncHandler(async (req: RequestWithUser, res: Response) => {
  const { id } = paramsSchema.parse(req.params);
  const { notes } = bodySchema.parse(req.body);
  const userId = req.userId;

  const existingAlert = await findAlertById(id);

  if (!existingAlert) {
    throw new HttpException(404, 'Alert not found');
  }

  if (existingAlert.status !== 'active') {
    throw new HttpException(400, `Cannot acknowledge alert with status: ${existingAlert.status}`);
  }

  const updated = await updateAlertStatus(id, 'acknowledged', userId, notes);

  if (!updated) {
    throw new HttpException(500, 'Failed to acknowledge alert');
  }

  ResponseFormatter.success(res, convertAlertToResponse(updated), 'Alert acknowledged successfully');
});

const router = Router();

router.patch(
  '/alerts/:id/acknowledge',
  requireAuth,
  requireRole(['policymaker', 'admin']),
  validationMiddleware(bodySchema),
  handler
);

export default router;
