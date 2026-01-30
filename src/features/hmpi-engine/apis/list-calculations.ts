/**
 * GET /api/nirmaya-engine/calculations
 * List water quality calculations with pagination and filtering
 * 
 * Requires: auth + role (admin, scientist, policymaker)
 * 
 * Query params:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20, max: 100)
 * - upload_id: Filter by upload ID
 * - state: Filter by state
 * - city: Filter by city
 * - station_id: Filter by station ID (partial match)
 * - hpi_classification: Filter by HPI classification
 * - mi_classification: Filter by MI classification
 * - wqi_classification: Filter by WQI classification
 */

import { Router, Response, Request } from 'express';
import { z } from 'zod';
import '../../../interfaces/request.interface';
import { requireAuth } from '../../../middlewares/auth.middleware';
import { requireRole } from '../../../middlewares/role.middleware';
import { ResponseFormatter } from '../../../utils/responseFormatter';
import { asyncHandler } from '../../../utils/controllerHelpers';
import { findCalculations, CalculationQueryParams } from '../shared/queries';
import { convertCalculation } from '../shared/interface';

// Query parameter schema
const querySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  upload_id: z.coerce.number().int().positive().optional(),
  state: z.string().optional(),
  city: z.string().optional(),
  station_id: z.string().optional(),
  hpi_min: z.coerce.number().optional(),
  hpi_max: z.coerce.number().optional(),
  mi_min: z.coerce.number().optional(),
  mi_max: z.coerce.number().optional(),
  classification: z.string().optional(),
  sort_by: z.enum(['hpi', 'mi', 'created_at', 'station_id', 'year']).default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
});

const handler = asyncHandler(async (req: Request, res: Response) => {
  // Parse and validate query parameters
  const query = querySchema.parse(req.query);
  
  // Build query params
  const params: CalculationQueryParams = {
    page: query.page,
    limit: query.limit,
    upload_id: query.upload_id,
    state: query.state,
    city: query.city,
    station_id: query.station_id,
    hpi_min: query.hpi_min,
    hpi_max: query.hpi_max,
    mi_min: query.mi_min,
    mi_max: query.mi_max,
    classification: query.classification,
    sort_by: query.sort_by,
    sort_order: query.sort_order,
  };

  // Get calculations with pagination
  const { calculations, total } = await findCalculations(params);

  // Convert to API format
  const data = calculations.map(convertCalculation);

  ResponseFormatter.paginated(
    res,
    data,
    {
      page: query.page,
      limit: query.limit,
      total,
    },
    'Water quality calculations retrieved successfully'
  );
});

const router = Router();

// GET /api/nirmaya-engine/calculations
router.get(
  '/calculations',
  requireAuth,
  requireRole(['admin', 'scientist', 'policymaker']),
  handler
);

export default router;
