/**
 * PUT /api/uploads/:id
 * Update upload metadata (Requires auth and ownership)
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { RequestWithUser } from '../../../interfaces/request.interface';
import { requireAuth } from '../../../middlewares/auth.middleware';
import validationMiddleware from '../../../middlewares/validation.middleware';
import { ResponseFormatter } from '../../../utils/responseFormatter';
import { asyncHandler, getUserId, parseIdParam } from '../../../utils/controllerHelpers';
import HttpException from '../../../utils/httpException';
import { db } from '../../../database/drizzle';
import { uploads } from '../shared/schema';
import { Upload, UploadUpdateInput, convertUpload } from '../shared/interface';
import { findUploadById } from '../shared/queries';

const uploadStatusSchema = z.enum(['pending', 'processing', 'completed', 'failed']);

const updateUploadSchema = z.object({
  filename: z.string().min(1, 'Filename is required').optional(),
  status: uploadStatusSchema.optional(),
  error_message: z.string().optional(),
});

async function handleUpdateUpload(
  uploadId: number,
  updateData: UploadUpdateInput,
  userId: number
): Promise<Upload> {
  const existingUpload = await findUploadById(uploadId, userId);

  if (!existingUpload) {
    throw new HttpException(404, 'Upload not found');
  }

  const [updatedUpload] = await db
    .update(uploads)
    .set({
      ...updateData,
      updated_at: new Date(),
    })
    .where(
      and(eq(uploads.id, uploadId), eq(uploads.user_id, userId), eq(uploads.is_deleted, false))
    )
    .returning();

  if (!updatedUpload) {
    throw new HttpException(500, 'Failed to update upload');
  }

  return convertUpload(updatedUpload);
}

const handler = asyncHandler(async (req: RequestWithUser, res: Response) => {
  const userId = getUserId(req);
  const uploadId = parseIdParam(req);
  const updateData = req.body as UploadUpdateInput;

  const updatedUpload = await handleUpdateUpload(uploadId, updateData, userId);

  ResponseFormatter.success(res, updatedUpload, 'Upload updated successfully');
});

const router = Router();
router.put('/:id', requireAuth, validationMiddleware(updateUploadSchema), handler);

export default router;
