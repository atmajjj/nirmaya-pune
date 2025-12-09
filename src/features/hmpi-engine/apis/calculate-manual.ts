/**
 * POST /api/nirmaya-engine/calculate-manual
 * Calculate HPI, MI indices from manually entered values
 * 
 * Requires: auth + role (admin, scientist, policymaker)
 * 
 * Input: Manual water quality measurements
 * Output: Calculated indices for the provided data
 */

import { Router, Response, Request } from 'express';
import { z } from 'zod';
import '../../../interfaces/request.interface';
import { requireAuth } from '../../../middlewares/auth.middleware';
import { requireRole } from '../../../middlewares/role.middleware';
import validationMiddleware from '../../../middlewares/validation.middleware';
import { ResponseFormatter } from '../../../utils/responseFormatter';
import { asyncHandler, getUserId } from '../../../utils/controllerHelpers';
import { WaterQualityCalculationService } from '../services/calculation.service';
import { db } from '../../../database/drizzle';
import { waterQualityCalculations } from '../shared/schema';
import { uploads } from '../../upload/shared/schema';

// Validation schema for manual calculation input
const bodySchema = z.object({
  station_id: z.string().min(1).max(100),
  
  // Location data (optional)
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  state: z.string().max(100).optional(),
  city: z.string().max(100).optional(),
  
  // Heavy metal concentrations in ppb (µg/L) - required
  metals: z.record(z.string(), z.number().nonnegative()).refine(
    (metals) => Object.keys(metals).length > 0,
    { message: 'At least one metal measurement must be provided' }
  ),
  
  // Option to save results to database
  save_to_database: z.boolean().default(true),
});

/**
 * Business logic: Calculate indices from manual input
 */
async function calculateManual(
  userId: number,
  data: z.infer<typeof bodySchema>
): Promise<any> {
  // Validate input data
  const validation = WaterQualityCalculationService.validateInputData(
    data.metals || {}
  );

  // Calculate indices
  const result = WaterQualityCalculationService.calculateSingle(
    data.station_id,
    data.metals || {},
    {
      latitude: data.latitude,
      longitude: data.longitude,
      state: data.state,
      city: data.city,
    }
  );

  // Save to database if requested
  let savedCalculation = null;
  if (data.save_to_database) {
    // Create a dummy upload record for manual calculations
    const [upload] = await db
      .insert(uploads)
      .values({
        filename: `manual-${data.station_id}-${Date.now()}.json`,
        original_filename: `Manual Calculation - ${data.station_id}`,
        mime_type: 'application/json',
        file_size: 0,
        file_path: 'manual-calculations',
        file_url: 'manual-calculations',
        user_id: userId,
        status: 'completed',
        created_by: userId,
        updated_by: userId,
      })
      .returning();

    const [calculation] = await db
      .insert(waterQualityCalculations)
      .values({
        upload_id: upload.id,
        station_id: result.station_id,
        latitude: result.latitude?.toString(),
        longitude: result.longitude?.toString(),
        state: result.state,
        city: result.city,
        hpi: result.hpi?.hpi.toString(),
        hpi_classification: result.hpi?.classification,
        mi: result.mi?.mi.toString(),
        mi_classification: result.mi?.classification,
        mi_class: result.mi?.miClass,
        metals_analyzed: result.hpi?.metalsAnalyzed.join(',') || result.mi?.metalsAnalyzed.join(',') || null,
        created_by: userId,
        updated_by: userId,
      })
      .returning();

    savedCalculation = calculation;
  }

  return {
    calculation: {
      station_id: result.station_id,
      location: {
        latitude: result.latitude,
        longitude: result.longitude,
        state: result.state,
        city: result.city,
      },
      indices: {
        hpi: result.hpi
          ? {
              value: result.hpi.hpi,
              classification: result.hpi.classification,
              metals_analyzed: result.hpi.metalsAnalyzed,
              metal_count: result.hpi.metalsAnalyzed.length,
            }
          : null,
        mi: result.mi
          ? {
              value: result.mi.mi,
              classification: result.mi.classification,
              class: result.mi.miClass,
              metals_analyzed: result.mi.metalsAnalyzed,
              metal_count: result.mi.metalsAnalyzed.length,
            }
          : null,
      },
      validation: {
        warnings: {
          metals: validation.metalWarnings,
        },
        is_valid: validation.isValid,
      },
    },
    saved_id: savedCalculation?.id || null,
  };
}

const handler = asyncHandler(async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const data = req.body as z.infer<typeof bodySchema>;

  const result = await calculateManual(userId, data);

  ResponseFormatter.success(
    res,
    result,
    'Manual calculation completed successfully'
  );
});

const router = Router();

// POST /api/nirmaya-engine/calculate-manual
// Requires auth and role (admin, scientist, policymaker can calculate)
router.post(
  '/calculate-manual',
  requireAuth,
  requireRole(['admin', 'scientist', 'policymaker']),
  validationMiddleware(bodySchema),
  handler
);

export default router;
