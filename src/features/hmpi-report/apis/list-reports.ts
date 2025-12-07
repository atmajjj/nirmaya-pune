// src/features/hmpi-report/apis/list-reports.ts
import { Router, Response } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../../middlewares/auth.middleware';
import { ResponseFormatter } from '../../../utils/responseFormatter';
import { asyncHandler } from '../../../utils/controllerHelpers';
import HttpException from '../../../utils/httpException';
import { listReports } from '../shared/queries';
import type { RequestWithUser } from '../../../interfaces/request.interface';

/**
 * Route params schema for upload ID
 */
const listReportsParamsSchema = z.object({
  uploadId: z.string().transform((val) => {
    const num = parseInt(val, 10);
    if (isNaN(num) || num <= 0) {
      throw new Error('Upload ID must be a positive integer');
    }
    return num;
  }),
});

/**
 * Query params schema for filtering and pagination
 */
const listReportsQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1))
    .refine((val) => val > 0, { message: 'page must be greater than 0' }),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 10))
    .refine((val) => val > 0 && val <= 100, {
      message: 'limit must be between 1 and 100',
    }),
  status: z.enum(['pending', 'generating', 'completed', 'failed']).optional(),
  report_type: z.enum(['summary', 'comprehensive']).optional(),
  sort_by: z
    .enum(['created_at', 'generated_at', 'file_size', 'total_stations'])
    .optional()
    .default('created_at'),
  sort_order: z.enum(['asc', 'desc']).optional().default('desc'),
});

/**
 * List Reports by Upload ID
 * 
 * Retrieves all reports generated for a specific upload with filtering,
 * sorting, and pagination options.
 * 
 * Features:
 * - Filter by status (pending/generating/completed/failed)
 * - Filter by report type (summary/comprehensive)
 * - Sort by multiple fields (created_at, generated_at, file_size, total_stations)
 * - Pagination support
 * 
 * @route GET /api/hmpi-report/upload/:uploadId
 * @query page - Page number (default: 1)
 * @query limit - Items per page (default: 10, max: 100)
 * @query status - Filter by report status
 * @query report_type - Filter by report type
 * @query sort_by - Sort field (default: created_at)
 * @query sort_order - Sort direction (default: desc)
 * @access Private (All authenticated users)
 */
const listByUploadHandler = asyncHandler(async (req: RequestWithUser, res: Response) => {
  const { uploadId } = req.params;

  // Validate upload ID
  const paramsResult = listReportsParamsSchema.safeParse({ uploadId });
  if (!paramsResult.success) {
    throw new HttpException(400, paramsResult.error.issues[0].message);
  }

  // Validate query parameters
  const queryResult = listReportsQuerySchema.safeParse(req.query);
  if (!queryResult.success) {
    throw new HttpException(400, queryResult.error.issues[0].message);
  }

  const uploadIdNum = paramsResult.data.uploadId;
  const { page, limit, status, report_type, sort_by, sort_order } = queryResult.data;

  // Fetch reports from database using listReports with upload_id filter
  const { reports, total } = await listReports({
    upload_id: uploadIdNum,
    page,
    limit,
    status,
    report_type,
    sort_by,
    sort_order,
  });

  ResponseFormatter.paginated(
    res,
    reports,
    { page, limit, total },
    `Retrieved ${reports.length} report(s) for upload ${uploadIdNum}`
  );
});

/**
 * List All Reports
 * 
 * Retrieves all reports with advanced filtering, sorting, and pagination.
 * Useful for admin dashboards and report management.
 * 
 * @route GET /api/hmpi-report
 * @query Same as list by upload ID
 * @access Private (All authenticated users)
 */
const listAllHandler = asyncHandler(async (req: RequestWithUser, res: Response) => {
  // Validate query parameters
  const queryResult = listReportsQuerySchema.safeParse(req.query);
  if (!queryResult.success) {
    throw new HttpException(400, queryResult.error.issues[0].message);
  }

  const { page, limit, status, report_type, sort_by, sort_order } = queryResult.data;

  // Fetch reports from database
  const { reports, total } = await listReports({
    page,
    limit,
    status,
    report_type,
    sort_by,
    sort_order,
  });

  ResponseFormatter.paginated(
    res,
    reports,
    { page, limit, total },
    `Retrieved ${reports.length} report(s)`
  );
});

const router = Router();

router.get('/upload/:uploadId', requireAuth, listByUploadHandler);
router.get('/', requireAuth, listAllHandler);

export default router;
