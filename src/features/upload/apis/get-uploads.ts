/**
 * GET /api/uploads (list all with pagination/filtering)
 * GET /api/uploads/:id (get by ID)
 * GET /api/uploads/status/:status (get by status)
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { eq, and, count, desc, asc } from 'drizzle-orm';
import { RequestWithUser } from '../../../interfaces/request.interface';
import { requireAuth } from '../../../middlewares/auth.middleware';
import validationMiddleware from '../../../middlewares/validation.middleware';
import { ResponseFormatter } from '../../../utils/responseFormatter';
import { asyncHandler, getUserId, parseIdParam } from '../../../utils/controllerHelpers';
import HttpException from '../../../utils/httpException';
import { db } from '../../../database/drizzle';
import { uploads } from '../shared/schema';
import { convertUpload } from '../shared/interface';
import { findUploadById } from '../shared/queries';

const uploadStatusSchema = z.enum(['pending', 'processing', 'completed', 'failed']);

const uploadQuerySchema = z.object({
  status: uploadStatusSchema.optional(),
  mime_type: z.string().optional(), // Allow any mime type string for filtering
  page: z.string().regex(/^\d+$/).transform(Number).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
  sort_by: z.enum(['created_at', 'file_size', 'original_filename']).optional(),
  sort_order: z.enum(['asc', 'desc']).optional(),
});

async function getUserUploadsWithPagination(
  userId: number,
  filters: z.infer<typeof uploadQuerySchema>
) {
  const {
    status,
    mime_type,
    page = 1,
    limit = 10,
    sort_by = 'created_at',
    sort_order = 'desc',
  } = filters;

  const conditions = [eq(uploads.user_id, userId), eq(uploads.is_deleted, false)];

  if (status) {
    conditions.push(eq(uploads.status, status));
  }
  if (mime_type) {
    conditions.push(eq(uploads.mime_type, mime_type));
  }

  const [{ total }] = await db
    .select({ total: count() })
    .from(uploads)
    .where(and(...conditions));

  const orderFn = sort_order === 'desc' ? desc : asc;
  const sortField = uploads[sort_by];

  const uploadsList = await db
    .select()
    .from(uploads)
    .where(and(...conditions))
    .orderBy(orderFn(sortField))
    .limit(limit)
    .offset((page - 1) * limit);

  return {
    uploads: uploadsList.map(convertUpload),
    total: Number(total),
    page,
    limit,
  };
}

const handleGetAllUploads = asyncHandler(async (req: RequestWithUser, res: Response) => {
  const userId = getUserId(req);
  const filters = req.query as z.infer<typeof uploadQuerySchema>;

  const result = await getUserUploadsWithPagination(userId, filters);

  ResponseFormatter.paginated(
    res,
    result.uploads,
    { page: result.page, limit: result.limit, total: result.total },
    'Uploads retrieved successfully'
  );
});

const handleGetUploadById = asyncHandler(async (req: RequestWithUser, res: Response) => {
  const userId = getUserId(req);
  const uploadId = parseIdParam(req);

  const upload = await findUploadById(uploadId, userId);

  if (!upload) {
    throw new HttpException(404, 'Upload not found');
  }

  ResponseFormatter.success(res, convertUpload(upload), 'Upload retrieved successfully');
});

const handleGetUploadsByStatus = asyncHandler(async (req: RequestWithUser, res: Response) => {
  const userId = getUserId(req);
  const { status } = req.params;

  const statusResult = uploadStatusSchema.safeParse(status);
  if (!statusResult.success) {
    throw new HttpException(400, 'Invalid upload status');
  }

  const uploadsList = await db
    .select()
    .from(uploads)
    .where(
      and(
        eq(uploads.user_id, userId),
        eq(uploads.status, statusResult.data),
        eq(uploads.is_deleted, false)
      )
    );

  ResponseFormatter.success(
    res,
    uploadsList.map(convertUpload),
    'Uploads retrieved successfully'
  );
});

const router = Router();

router.get('/', requireAuth, validationMiddleware(uploadQuerySchema, 'query'), handleGetAllUploads);
router.get('/status/:status', requireAuth, handleGetUploadsByStatus);
router.get('/:id', requireAuth, handleGetUploadById);

export default router;
