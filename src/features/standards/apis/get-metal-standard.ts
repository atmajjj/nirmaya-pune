/**
 * GET /api/standards/metals/:id
 * Get a specific metal standard by ID
 * 
 * Authorization: Scientist, Admin
 */

import { Router, Response } from 'express';
import { requireAuth } from '../../../middlewares/auth.middleware';
import { requireRole } from '../../../middlewares/role.middleware';
import { ResponseFormatter } from '../../../utils/responseFormatter';
import { asyncHandler } from '../../../utils/controllerHelpers';
import HttpException from '../../../utils/httpException';
import { getMetalStandardById } from '../shared/queries';

const handler = asyncHandler(async (req: any, res: Response) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    throw new HttpException(400, 'Invalid standard ID');
  }

  const standard = await getMetalStandardById(id);
  if (!standard) {
    throw new HttpException(404, 'Metal standard not found');
  }

  ResponseFormatter.success(res, standard, 'Metal standard retrieved successfully');
});

const router = Router();
router.get('/standards/metals/:id', requireAuth, requireRole(['admin', 'scientist']), handler);
export default router;
