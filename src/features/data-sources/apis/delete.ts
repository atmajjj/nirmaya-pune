import { Router, Response } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../../middlewares/auth.middleware';
import validationMiddleware from '../../../middlewares/validation.middleware';
import { ResponseFormatter } from '../../../utils/responseFormatter';
import { asyncHandler } from '../../../utils/controllerHelpers';
import HttpException from '../../../utils/httpException';
import { findDataSourceById, deleteDataSource } from '../shared/queries';

const paramsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

async function removeDataSource(id: number, userId: number, userRole: string): Promise<void> {
  const dataSource = await findDataSourceById(id);

  if (!dataSource) {
    throw new HttpException(404, 'Data source not found');
  }

  // Field technicians can only delete their own uploads
  // Scientists and admins can delete any data source
  if (userRole === 'field_technician' && dataSource.uploaded_by !== userId) {
    throw new HttpException(403, 'You do not have permission to delete this data source');
  }

  // Prevent deletion of data sources that are currently being processed
  if (dataSource.status === 'processing') {
    throw new HttpException(400, 'Cannot delete a data source that is currently being processed');
  }

  await deleteDataSource(id, userId);
}

const handler = asyncHandler(async (req: any, res: Response) => {
  const { id } = req.params;
  const userId = req.userId!;
  const userRole = req.userRole!;

  await removeDataSource(parseInt(id), userId, userRole);

  ResponseFormatter.noContent(res);
});

const router = Router();

router.delete('/:id', requireAuth, validationMiddleware(paramsSchema, 'params'), handler);

export default router;
