/**
 * GET /api/standards/metals
 * Get all metal standards (active and inactive)
 * 
 * Authorization: Scientist, Admin
 */

import { Router, Response } from 'express';
import { requireAuth } from '../../../middlewares/auth.middleware';
import { requireRole } from '../../../middlewares/role.middleware';
import { ResponseFormatter } from '../../../utils/responseFormatter';
import { asyncHandler } from '../../../utils/controllerHelpers';
import { db } from '../../../database/drizzle';
import { metalStandards } from '../shared/schema';
import { eq } from 'drizzle-orm';

async function getMetalStandards() {
  return db
    .select()
    .from(metalStandards)
    .where(eq(metalStandards.is_deleted, false))
    .orderBy(metalStandards.symbol);
}

const handler = asyncHandler(async (req: any, res: Response) => {
  const standards = await getMetalStandards();
  ResponseFormatter.success(res, standards, 'Metal standards retrieved successfully');
});

const router = Router();
router.get('/metals', requireAuth, requireRole(['admin', 'scientist']), handler);
export default router;
