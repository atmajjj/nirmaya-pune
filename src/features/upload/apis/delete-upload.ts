/**
 * DELETE /api/uploads/:id
 * Soft delete an upload (Requires auth and ownership)
 */

import { Router, Response } from 'express';
import { eq } from 'drizzle-orm';
import { RequestWithUser } from '../../../interfaces/request.interface';
import { requireAuth } from '../../../middlewares/auth.middleware';
import { ResponseFormatter } from '../../../utils/responseFormatter';
import { asyncHandler, getUserId, parseIdParam } from '../../../utils/controllerHelpers';
import HttpException from '../../../utils/httpException';
import { db } from '../../../database/drizzle';
import { uploads } from '../shared/schema';
import { findUploadById } from '../shared/queries';

async function handleDeleteUpload(uploadId: number, userId: number): Promise<void> {
  const existingUpload = await findUploadById(uploadId, userId);

  if (!existingUpload) {
    throw new HttpException(404, 'Upload not found');
  }

  const [deletedUpload] = await db
    .update(uploads)
    .set({
      is_deleted: true,
      deleted_by: userId,
      deleted_at: new Date(),
    })
    .where(eq(uploads.id, uploadId))
    .returning();

  if (!deletedUpload) {
    throw new HttpException(500, 'Failed to delete upload');
  }
}

const handler = asyncHandler(async (req: RequestWithUser, res: Response) => {
  const userId = getUserId(req);
  const uploadId = parseIdParam(req);

  await handleDeleteUpload(uploadId, userId);

  ResponseFormatter.success(res, null, 'Upload deleted successfully');
});

const router = Router();
router.delete('/:id', requireAuth, handler);

export default router;
