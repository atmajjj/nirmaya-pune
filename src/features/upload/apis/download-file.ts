/**
 * GET /api/v1/uploads/:id/download
 * Download file from S3 (Requires auth and ownership)
 */

import { Router, Response } from 'express';
import { Readable } from 'stream';
import { RequestWithUser } from '../../../interfaces/request.interface';
import { requireAuth } from '../../../middlewares/auth.middleware';
import { requireRole } from '../../../middlewares/role.middleware';
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

  if (stream instanceof Readable) {
    stream.pipe(res);
  } else {
    const readableStream = stream as Readable;
    readableStream.pipe(res);
  }
});

const router = Router();
router.get(
  '/:id/download',
  requireAuth,
  requireRole(['admin', 'scientist', 'researcher', 'policymaker']),
  handler
);

export default router;
