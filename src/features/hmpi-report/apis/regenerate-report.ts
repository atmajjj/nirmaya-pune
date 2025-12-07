// src/features/hmpi-report/apis/regenerate-report.ts
import { Router, Response } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../../middlewares/auth.middleware';
import { requireRole } from '../../../middlewares/role.middleware';
import { ResponseFormatter } from '../../../utils/responseFormatter';
import { asyncHandler } from '../../../utils/controllerHelpers';
import HttpException from '../../../utils/httpException';
import { ReportGeneratorService } from '../services/report-generator.service';
import type { RequestWithUser } from '../../../interfaces/request.interface';

/**
 * Route params schema for report ID
 */
const regenerateReportParamsSchema = z.object({
  id: z.string().transform((val) => {
    const num = parseInt(val, 10);
    if (isNaN(num) || num <= 0) {
      throw new Error('Report ID must be a positive integer');
    }
    return num;
  }),
});

/**
 * Regenerate Failed Report
 * 
 * Re-generates a failed report or creates a new version of an existing report.
 * Useful for:
 * - Recovering from generation failures
 * - Updating reports after data corrections
 * - Creating new versions with updated calculations
 * 
 * The regenerated report will:
 * - Use the latest calculation data from the database
 * - Generate new charts and statistics
 * - Upload a new PDF to S3 with a new filename
 * - Update the same report record with new metadata
 * 
 * @route POST /api/hmpi-report/:id/regenerate
 * @access Private (Admin, Scientist)
 */
const handler = asyncHandler(async (req: RequestWithUser, res: Response) => {
  const { id } = req.params;
  const userId = req.userId;

  // Validate and parse ID
  const parsed = regenerateReportParamsSchema.safeParse({ id });
  if (!parsed.success) {
    throw new HttpException(400, parsed.error.issues[0].message);
  }

  const reportId = parsed.data.id;

  // Regenerate the report
  const report = await ReportGeneratorService.regenerateReport(reportId, userId);

  ResponseFormatter.success(
    res,
    {
      report,
      message: 'Report has been regenerated successfully.',
    },
    'Report regeneration completed'
  );
});

const router = Router();

router.post(
  '/:id/regenerate',
  requireAuth,
  requireRole(['admin', 'scientist']),
  handler
);

export default router;
