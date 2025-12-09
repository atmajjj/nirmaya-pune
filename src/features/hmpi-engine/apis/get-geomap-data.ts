/**
 * GET /api/nirmaya-engine/geomap
 * Get geographical map data for all water quality monitoring stations
 * 
 * Requires: auth + role (admin, scientist, policymaker, researcher)
 * 
 * Returns location data with coordinates, HPI scores, and risk levels
 * for frontend map visualization.
 * 
 * Query params:
 * - state: Filter by state (optional)
 * - upload_id: Filter by upload ID (optional)
 * - risk_level: Filter by risk level - safe, moderate, unsafe (optional)
 * - year: Filter by year (optional)
 * - min_hpi: Minimum HPI value (optional)
 * - max_hpi: Maximum HPI value (optional)
 */

import { Router, Response, Request } from 'express';
import { z } from 'zod';
import '../../../interfaces/request.interface';
import { requireAuth } from '../../../middlewares/auth.middleware';
import { requireRole } from '../../../middlewares/role.middleware';
import { ResponseFormatter } from '../../../utils/responseFormatter';
import { asyncHandler } from '../../../utils/controllerHelpers';
import { getGeomapData } from '../shared/queries';

// Query parameter schema
const querySchema = z.object({
  state: z.string().optional(),
  upload_id: z.coerce.number().int().positive().optional(),
  risk_level: z.enum(['safe', 'moderate', 'unsafe']).optional(),
  year: z.coerce.number().int().optional(),
  min_hpi: z.coerce.number().optional(),
  max_hpi: z.coerce.number().optional(),
});

const handler = asyncHandler(async (req: Request, res: Response) => {
  // Parse and validate query parameters
  const query = querySchema.parse(req.query);

  // Get geomap data
  const geomapData = await getGeomapData({
    state: query.state,
    uploadId: query.upload_id,
    riskLevel: query.risk_level,
    year: query.year,
    minHpi: query.min_hpi,
    maxHpi: query.max_hpi,
  });

  ResponseFormatter.success(
    res,
    geomapData,
    `Retrieved ${geomapData.length} monitoring stations`
  );
});

const router = Router();

// GET /api/nirmaya-engine/geomap
router.get(
  '/geomap',
  requireAuth,
  requireRole(['admin', 'scientist', 'policymaker', 'researcher']),
  handler
);

export default router;
