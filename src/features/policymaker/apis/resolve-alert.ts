/**
 * PATCH /api/policymaker/alerts/:id/resolve
 * Resolve an alert
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
  resolution_notes: z.string().min(1, 'Resolution notes are required'),
});

const handler = asyncHandler(async (req: RequestWithUser, res: Response) => {
  const { id } = paramsSchema.parse(req.params);
  const { resolution_notes } = bodySchema.parse(req.body);
  const userId = req.userId;

  const existingAlert = await findAlertById(id);

  if (!existingAlert) {
    throw new HttpException(404, 'Alert not found');
  }

  if (existingAlert.status === 'resolved') {
    throw new HttpException(400, 'Alert is already resolved');
  }

  const updated = await updateAlertStatus(id, 'resolved', userId, resolution_notes);

  if (!updated) {
    throw new HttpException(500, 'Failed to resolve alert');
  }

  ResponseFormatter.success(res, convertAlertToResponse(updated), 'Alert resolved successfully');
});

const router = Router();

router.patch(
  '/alerts/:id/resolve',
  requireAuth,
  requireRole(['policymaker', 'admin']),
  validationMiddleware(bodySchema),
  handler
);

export default router;
