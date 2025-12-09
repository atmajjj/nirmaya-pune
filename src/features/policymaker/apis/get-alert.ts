/**
 * GET /api/policymaker/alerts/:id
 * Get single alert by ID
 * Access: policymaker, admin
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../../middlewares/auth.middleware';
import { requireRole } from '../../../middlewares/role.middleware';
import { ResponseFormatter } from '../../../utils/responseFormatter';
import { asyncHandler } from '../../../utils/controllerHelpers';
import HttpException from '../../../utils/httpException';
import { findAlertById } from '../shared/queries';
import { convertAlertToResponse } from '../shared/interface';

const paramsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const handler = asyncHandler(async (req, res: Response) => {
  const { id } = paramsSchema.parse(req.params);

  const alert = await findAlertById(id);

  if (!alert) {
    throw new HttpException(404, 'Alert not found');
  }

  ResponseFormatter.success(res, convertAlertToResponse(alert), 'Alert fetched successfully');
});

const router = Router();

router.get(
  '/alerts/:id',
  requireAuth,
  requireRole(['policymaker', 'admin']),
  handler
);

export default router;
