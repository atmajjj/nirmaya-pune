// src/features/hmpi-report/apis/get-report.ts
import { Router, Response } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../../middlewares/auth.middleware';
import { ResponseFormatter } from '../../../utils/responseFormatter';
import { asyncHandler } from '../../../utils/controllerHelpers';
import HttpException from '../../../utils/httpException';
import { findReportById } from '../shared/queries';
import type { RequestWithUser } from '../../../interfaces/request.interface';

/**
 * Route params schema for report ID
 */
const getReportParamsSchema = z.object({
  id: z.string().transform((val) => {
    const num = parseInt(val, 10);
    if (isNaN(num) || num <= 0) {
      throw new Error('Report ID must be a positive integer');
    }
    return num;
  }),
});

/**
 * Get Report Details
 * 
 * Retrieves metadata and status of a specific HMPI report including:
 * - Report status (pending/generating/completed/failed)
 * - File information (size, path, URL)
 * - Statistics (total stations, averages)
 * - Generation timestamps
 * 
 * @route GET /api/hmpi-report/:id
 * @access Private (All authenticated users)
 */
const handler = asyncHandler(async (req: RequestWithUser, res: Response) => {
  const { id } = req.params;
  
  // Validate and parse ID
  const parsed = getReportParamsSchema.safeParse({ id });
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

  ResponseFormatter.success(
    res,
    { report },
    'Report retrieved successfully'
  );
});

const router = Router();

router.get('/:id', requireAuth, handler);

export default router;
