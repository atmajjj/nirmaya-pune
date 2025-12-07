// src/features/hmpi-report/apis/download-report.ts
import { Router, Response } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../../middlewares/auth.middleware';
import { ResponseFormatter } from '../../../utils/responseFormatter';
import { asyncHandler } from '../../../utils/controllerHelpers';
import HttpException from '../../../utils/httpException';
import { findReportById } from '../shared/queries';
import { getPresignedDownloadUrl } from '../../../utils/s3Upload';
import type { RequestWithUser } from '../../../interfaces/request.interface';

/**
 * Route params schema for report ID
 */
const downloadReportParamsSchema = z.object({
  id: z.string().transform((val) => {
    const num = parseInt(val, 10);
    if (isNaN(num) || num <= 0) {
      throw new Error('Report ID must be a positive integer');
    }
    return num;
  }),
});

/**
 * Query params schema for download options
 */
const downloadReportQuerySchema = z.object({
  expires_in: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 3600))
    .refine((val) => val >= 60 && val <= 86400, {
      message: 'expires_in must be between 60 and 86400 seconds (1 min - 24 hours)',
    }),
});

/**
 * Download Report PDF
 * 
 * Generates a secure pre-signed URL for downloading the report PDF.
 * The URL expires after the specified duration (default: 1 hour).
 * 
 * Features:
 * - Secure pre-signed S3 URLs (files are private by default)
 * - Configurable expiration time (1 min - 24 hours)
 * - Only completed reports can be downloaded
 * - Returns download URL with metadata
 * 
 * @route GET /api/hmpi-report/:id/download
 * @query expires_in - URL expiration time in seconds (default: 3600, range: 60-86400)
 * @access Private (All authenticated users)
 */
const handler = asyncHandler(async (req: RequestWithUser, res: Response) => {
  const { id } = req.params;
  const { expires_in = 3600 } = req.query;

  // Validate and parse parameters
  const paramsResult = downloadReportParamsSchema.safeParse({ id });
  if (!paramsResult.success) {
    throw new HttpException(400, paramsResult.error.issues[0].message);
  }

  const queryResult = downloadReportQuerySchema.safeParse({ expires_in });
  if (!queryResult.success) {
    throw new HttpException(400, queryResult.error.issues[0].message);
  }

  const reportId = paramsResult.data.id;
  const expiresIn = queryResult.data.expires_in;

  // Fetch report from database
  const report = await findReportById(reportId);

  if (!report) {
    throw new HttpException(404, `Report with ID ${reportId} not found`);
  }

  // Check if report is soft-deleted
  if (report.is_deleted) {
    throw new HttpException(404, 'Report not found or has been deleted');
  }

  // Check if report is completed
  if (report.status !== 'completed') {
    throw new HttpException(
      400,
      `Report is ${report.status}. Only completed reports can be downloaded.`
    );
  }

  // Check if file path exists
  if (!report.file_path) {
    throw new HttpException(500, 'Report file path not found. Please regenerate the report.');
  }

  // Generate pre-signed download URL
  const downloadUrl = await getPresignedDownloadUrl(report.file_path, expiresIn);

  ResponseFormatter.success(
    res,
    {
      downloadUrl,
      fileName: report.file_name,
      fileSize: report.file_size,
      expiresIn,
      expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
    },
    'Download URL generated successfully'
  );
});

const router = Router();

router.get('/:id/download', requireAuth, handler);

export default router;
