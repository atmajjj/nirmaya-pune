/**
 * GET /api/uploads/:id/download
 * Download file from S3 (Requires auth and ownership)
 */

import { Router, Response } from 'express';
import { Readable } from 'stream';
import { RequestWithUser } from '../../../interfaces/request.interface';
import { requireAuth } from '../../../middlewares/auth.middleware';
import { asyncHandler, getUserId, parseIdParam } from '../../../utils/controllerHelpers';
import HttpException from '../../../utils/httpException';
import { downloadFromS3 } from '../../../utils/s3Upload';
import { findUploadById } from '../shared/queries';

const handler = asyncHandler(async (req: RequestWithUser, res: Response) => {
  const uploadId = parseIdParam(req);
  const userId = getUserId(req);

  const upload = await findUploadById(uploadId, userId);

  if (!upload) {
    throw new HttpException(404, 'Upload not found');
  }

  const { stream, contentType, contentLength } = await downloadFromS3(upload.file_path);

  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Length', contentLength);
  res.setHeader('Content-Disposition', `attachment; filename="${upload.original_filename}"`);

  // S3 SDK returns a Readable stream
  (stream as Readable).pipe(res);
});

const router = Router();
router.get('/:id/download', requireAuth, handler);

export default router;
