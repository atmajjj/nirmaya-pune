// src/features/hmpi-report/apis/get-report-status.ts
import { Router, Response } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../../middlewares/auth.middleware';
import { ResponseFormatter } from '../../../utils/responseFormatter';
import { asyncHandler } from '../../../utils/controllerHelpers';
import HttpException from '../../../utils/httpException';
import { findReportById } from '../shared/queries';
import { ReportGeneratorService } from '../services/report-generator.service';
import type { RequestWithUser } from '../../../interfaces/request.interface';

/**
 * Route params schema for report ID
 */
const getReportStatusParamsSchema = z.object({
  id: z.string().transform((val) => {
    const num = parseInt(val, 10);
    if (isNaN(num) || num <= 0) {
      throw new Error('Report ID must be a positive integer');
    }
    return num;
  }),
});

/**
 * Get Report Generation Status
 * 
 * Retrieves the current status and progress of report generation.
 * Useful for polling during async report generation to show progress to users.
 * 
 * Returns:
 * - Current status (pending/generating/completed/failed)
 * - Progress percentage (0-100)
 * - Error message (if failed)
 * - Estimated time remaining
 * 
 * @route GET /api/hmpi-report/:id/status
 * @access Private (All authenticated users)
 */
const handler = asyncHandler(async (req: RequestWithUser, res: Response) => {
  const { id } = req.params;

  // Validate and parse ID
  const parsed = getReportStatusParamsSchema.safeParse({ id });
  if (!parsed.success) {
    throw new HttpException(400, parsed.error.issues[0].message);
  }

  const reportId = parsed.data.id;

  // Fetch report from database
  const report = await findReportById(reportId);

  if (!report) {
    throw new HttpException(404, `Report with ID ${reportId} not found`);
  }

  // Check if report is soft-deleted
  if (report.is_deleted) {
    throw new HttpException(404, 'Report not found or has been deleted');
  }

  // Get progress percentage
  const progress = await ReportGeneratorService.getReportProgress(reportId);

  // Prepare status response (report dates are already ISO strings from convertReport)
  const statusResponse = {
    reportId: report.id,
    status: report.status,
    progress,
    errorMessage: report.error_message,
    createdAt: report.created_at,
    generatedAt: report.generated_at,
    isComplete: report.status === 'completed',
    isFailed: report.status === 'failed',
    canDownload: report.status === 'completed' && !!report.file_path,
  };

  ResponseFormatter.success(
    res,
    statusResponse,
    'Report status retrieved successfully'
  );
});

const router = Router();

router.get('/:id/status', requireAuth, handler);

export default router;
