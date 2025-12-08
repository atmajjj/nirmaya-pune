import { Router, Response } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../../middlewares/auth.middleware';
import validationMiddleware from '../../../middlewares/validation.middleware';
import { ResponseFormatter } from '../../../utils/responseFormatter';
import { asyncHandler } from '../../../utils/controllerHelpers';
import HttpException from '../../../utils/httpException';
import { findDataSourceWithUploaderById } from '../shared/queries';
import { DataSourceResponse } from '../shared/interface';

const paramsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

async function getDataSourceDetails(id: number, userId: number, userRole: string): Promise<DataSourceResponse> {
  const dataSource = await findDataSourceWithUploaderById(id);

  if (!dataSource) {
    throw new HttpException(404, 'Data source not found');
  }

  // Field technicians can only view their own uploads
  if (userRole === 'field_technician' && dataSource.uploaded_by !== userId) {
    throw new HttpException(403, 'You do not have permission to view this data source');
  }

  return {
    id: dataSource.id,
    filename: dataSource.filename,
    original_filename: dataSource.original_filename,
    file_type: dataSource.file_type as 'csv' | 'xlsx' | 'xls',
    mime_type: dataSource.mime_type,
    file_size: dataSource.file_size,
    file_url: dataSource.file_url,
    status: dataSource.status as 'pending' | 'available' | 'processing' | 'archived' | 'failed',
    error_message: dataSource.error_message,
    metadata: dataSource.metadata,
    description: dataSource.description,
    uploaded_by: dataSource.uploaded_by,
    uploader: dataSource.uploader,
    created_at: dataSource.created_at,
    updated_at: dataSource.updated_at,
  };
}

const handler = asyncHandler(async (req: any, res: Response) => {
  const { id } = req.params;
  const userId = req.userId!;
  const userRole = req.userRole!;

  const result = await getDataSourceDetails(parseInt(id), userId, userRole);

  ResponseFormatter.success(res, result, 'Data source retrieved successfully');
});

const router = Router();

router.get('/:id', requireAuth, validationMiddleware(paramsSchema, 'params'), handler);

export default router;
