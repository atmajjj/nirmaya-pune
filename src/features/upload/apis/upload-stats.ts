/**
 * GET /api/uploads/stats
 * Get upload statistics (Requires auth)
 */

import { Router, Response } from 'express';
import { eq, and, count, sql } from 'drizzle-orm';
import { RequestWithUser } from '../../../interfaces/request.interface';
import { requireAuth } from '../../../middlewares/auth.middleware';
import { ResponseFormatter } from '../../../utils/responseFormatter';
import { asyncHandler, getUserId } from '../../../utils/controllerHelpers';
import { db } from '../../../database/drizzle';
import { uploads } from '../shared/schema';
import { UploadStats } from '../shared/interface';

async function getUserUploadStats(userId: number): Promise<UploadStats> {
  const [stats] = await db
    .select({
      total_uploads: count(),
      total_size: sql<number>`COALESCE(SUM(${uploads.file_size}), 0)`,
      pending_count: sql<number>`COUNT(CASE WHEN ${uploads.status} = 'pending' THEN 1 END)`,
      processing_count: sql<number>`COUNT(CASE WHEN ${uploads.status} = 'processing' THEN 1 END)`,
      completed_count: sql<number>`COUNT(CASE WHEN ${uploads.status} = 'completed' THEN 1 END)`,
      failed_count: sql<number>`COUNT(CASE WHEN ${uploads.status} = 'failed' THEN 1 END)`,
    })
    .from(uploads)
    .where(and(eq(uploads.user_id, userId), eq(uploads.is_deleted, false)));

  const uploadsByType = await db
    .select({
      mime_type: uploads.mime_type,
      count: count(),
    })
    .from(uploads)
    .where(and(eq(uploads.user_id, userId), eq(uploads.is_deleted, false)))
    .groupBy(uploads.mime_type);

  const uploadsByTypeMap = uploadsByType.reduce(
    (acc, item) => {
      acc[item.mime_type] = Number(item.count);
      return acc;
    },
    {} as Record<string, number>
  );

  return {
    total_uploads: Number(stats.total_uploads),
    total_size: Number(stats.total_size),
    uploads_by_status: {
      pending: Number(stats.pending_count),
      processing: Number(stats.processing_count),
      completed: Number(stats.completed_count),
      failed: Number(stats.failed_count),
    },
    uploads_by_type: uploadsByTypeMap,
  };
}

const handler = asyncHandler(async (req: RequestWithUser, res: Response) => {
  const userId = getUserId(req);

  const stats = await getUserUploadStats(userId);

  ResponseFormatter.success(res, stats, 'Upload statistics retrieved successfully');
});

const router = Router();
router.get('/stats', requireAuth, handler);

export default router;
