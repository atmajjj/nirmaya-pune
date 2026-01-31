// src/features/hmpi-report/apis/generate-report.ts
import { Router, Response } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../../middlewares/auth.middleware';
import { requireRole } from '../../../middlewares/role.middleware';
import validationMiddleware from '../../../middlewares/validation.middleware';
import { ResponseFormatter } from '../../../utils/responseFormatter';
import { asyncHandler } from '../../../utils/controllerHelpers';
import HttpException from '../../../utils/httpException';
import { ReportGeneratorService } from '../services/report-generator.service';
import type { RequestWithUser } from '../../../interfaces/request.interface';

/**
 * Request body schema for report generation
 */
const generateReportSchema = z.object({
  upload_id: z.number().int().positive({ message: 'upload_id must be a positive integer' }),
  report_type: z.enum(['summary', 'comprehensive']).optional().default('comprehensive'),
});

/**
 * Generate HMPI Report
 * 
 * Creates a comprehensive PDF report from HMPI calculations with:
 * - Statistical analysis (averages, distributions)
 * - 8 visualizations (bar/pie charts)
 * - Classification breakdowns
 * - Geographic distribution
 * - Recommendations
 * 
 * @route POST /api/hmpi-report/generate
 * @access Private (Admin, Scientist, Researcher)
 */
const handler = asyncHandler(async (req: RequestWithUser, res: Response) => {
  const { upload_id, report_type } = req.body;
  const userId = req.userId;

  // Validate that the upload has calculations before generating report
  const canGenerate = await ReportGeneratorService.canGenerateReport(upload_id);
  
  if (!canGenerate) {
    throw new HttpException(
      400,
      'Cannot generate report: No HMPI calculations found for this upload. Please run calculations first.'
    );
  }

  // Generate the report (this will run asynchronously in the background)
  const report = await ReportGeneratorService.generateReport(
    upload_id,
    userId,
    report_type
  );

  // Estimate generation time for user feedback (based on a rough estimate of stations)
  const estimatedSeconds = ReportGeneratorService.estimateGenerationTime(100);
  const estimatedTime = `${estimatedSeconds} seconds`;

  ResponseFormatter.created(
    res,
    {
      report,
      estimatedTime,
    },
    'Report generation initiated successfully'
  );
});

const router = Router();

router.post(
  '/generate',
  requireAuth,
  requireRole(['admin', 'scientist', 'researcher']),
  validationMiddleware(generateReportSchema),
  handler
);

export default router;
