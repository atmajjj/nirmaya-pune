/**
 * POST /api/uploads
 * Upload file to S3 and create record (Requires auth)
 */

import { Router, Response, Request } from 'express';
// Import to ensure global Express interface extension is loaded
import '../../../interfaces/request.interface';
import { requireAuth } from '../../../middlewares/auth.middleware';
import { uploadSingleFileMiddleware } from '../../../middlewares/upload.middleware';
import { ResponseFormatter } from '../../../utils/responseFormatter';
import { asyncHandler, getUserId } from '../../../utils/controllerHelpers';
import HttpException from '../../../utils/httpException';
import { uploadToS3 } from '../../../utils/s3Upload';
import { db } from '../../../database/drizzle';
import { uploads } from '../shared/schema';
import { Upload } from '../shared/interface';

async function handleCreateUpload(file: Express.Multer.File, userId: number): Promise<Upload> {
  const s3Result = await uploadToS3(file.buffer, file.originalname, file.mimetype, userId);

  const [upload] = await db.insert(uploads).values({
    filename: file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_'),
    original_filename: file.originalname,
    mime_type: file.mimetype,
    file_size: file.size,
    file_path: s3Result.key,
    file_url: s3Result.url,
    user_id: userId,
    created_by: userId,
  }).returning();

  if (!upload) {
    throw new HttpException(500, 'Failed to create upload record');
  }

  return {
    ...upload,
    created_at: upload.created_at.toISOString(),
    updated_at: upload.updated_at.toISOString(),
    deleted_at: upload.deleted_at?.toISOString(),
  } as Upload;
}

const handler = asyncHandler(async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const file = req.file;

  if (!file) {
    throw new HttpException(400, 'No file uploaded');
  }

  const upload = await handleCreateUpload(file, userId);

  ResponseFormatter.created(res, upload, 'File uploaded successfully');
});

const router = Router();
router.post('/', requireAuth, uploadSingleFileMiddleware, handler);

export default router;
