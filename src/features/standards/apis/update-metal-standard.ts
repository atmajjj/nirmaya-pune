/**
 * PUT /api/standards/metals/:id
 * Update a metal standard
 * 
 * Authorization: Scientist, Admin
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../../middlewares/auth.middleware';
import { requireRole } from '../../../middlewares/role.middleware';
import validationMiddleware from '../../../middlewares/validation.middleware';
import { ResponseFormatter } from '../../../utils/responseFormatter';
import { asyncHandler } from '../../../utils/controllerHelpers';
import HttpException from '../../../utils/httpException';
import { db } from '../../../database/drizzle';
import { metalStandards } from '../shared/schema';
import { eq, and } from 'drizzle-orm';

const schema = z.object({
  name: z.string().min(1).max(100).optional(),
  si: z.number().positive().optional(),
  ii: z.number().nonnegative().optional(),
  mac: z.number().positive().optional(),
});

async function updateMetalStandard(
  id: number,
  data: z.infer<typeof schema>,
  userId: number
) {
  // Check if standard exists
  const [existing] = await db
    .select()
    .from(metalStandards)
    .where(and(eq(metalStandards.id, id), eq(metalStandards.is_deleted, false)))
    .limit(1);

  if (!existing) {
    throw new HttpException(404, 'Metal standard not found');
  }

  // Update standard
  const [updated] = await db
    .update(metalStandards)
    .set({
      ...data,
      si: data.si?.toString(),
      ii: data.ii?.toString(),
      mac: data.mac?.toString(),
      updated_by: userId,
      updated_at: new Date(),
    })
    .where(eq(metalStandards.id, id))
    .returning();

  return updated;
}

const handler = asyncHandler(async (req: any, res: Response) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    throw new HttpException(400, 'Invalid standard ID');
  }

  const updated = await updateMetalStandard(id, req.body, req.userId);
  ResponseFormatter.success(res, updated, 'Metal standard updated successfully');
});

const router = Router();
router.put(
  '/standards/metals/:id',
  requireAuth,
  requireRole(['admin', 'scientist']),
  validationMiddleware(schema),
  handler
);
export default router;
