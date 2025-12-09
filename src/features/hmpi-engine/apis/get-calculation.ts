/**
 * GET /api/nirmaya-engine/calculations/:id
 * Get a single water quality calculation by ID
 * 
 * Requires: auth + role (admin, scientist, policymaker)
 */

import { Router, Response, Request } from 'express';
import { z } from 'zod';
import '../../../interfaces/request.interface';
import { requireAuth } from '../../../middlewares/auth.middleware';
import { requireRole } from '../../../middlewares/role.middleware';
import { ResponseFormatter } from '../../../utils/responseFormatter';
import { asyncHandler } from '../../../utils/controllerHelpers';
import HttpException from '../../../utils/httpException';
import { findCalculationById } from '../shared/queries';
import { convertCalculation } from '../shared/interface';

// Param schema
const paramSchema = z.object({
  id: z.coerce.number().int().positive(),
});

// Query schema for detailed analysis
const querySchema = z.object({
  include_analysis: z.enum(['true', 'false']).default('false'),
});

/**
 * Build detailed analysis for a calculation
 */
function buildDetailedAnalysis(
  metalsAnalyzed: string[] | null
) {
  // Note: We can't rebuild full analysis without original values
  // This provides structure information only
  return {
    hpi_metals: metalsAnalyzed || [],
    mi_metals: metalsAnalyzed || [],
    note: 'Detailed per-parameter analysis requires original input values',
  };
}

const handler = asyncHandler(async (req: Request, res: Response) => {
  // Parse and validate parameters
  const { id } = paramSchema.parse(req.params);
  const { include_analysis } = querySchema.parse(req.query);

  // Find calculation
  const calculation = await findCalculationById(id);

  if (!calculation) {
    throw new HttpException(404, 'Calculation not found');
  }

  // Convert to API format
  const data = convertCalculation(calculation);

  // Include analysis if requested
  if (include_analysis === 'true') {
    const analysis = buildDetailedAnalysis(
      data.metals_analyzed
    );
    
    ResponseFormatter.success(res, { ...data, analysis }, 'Calculation retrieved successfully');
  } else {
    ResponseFormatter.success(res, data, 'Calculation retrieved successfully');
  }
});

const router = Router();

// GET /api/nirmaya-engine/calculations/:id
router.get(
  '/calculations/:id',
  requireAuth,
  requireRole(['admin', 'scientist', 'policymaker']),
  handler
);

export default router;
