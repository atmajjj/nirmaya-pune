import { Router, Response } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../../middlewares/auth.middleware';
import { requireRole } from '../../../middlewares/role.middleware';
import validationMiddleware from '../../../middlewares/validation.middleware';
import { ResponseFormatter } from '../../../utils/responseFormatter';
import { asyncHandler } from '../../../utils/controllerHelpers';
import HttpException from '../../../utils/httpException';
import { findDataSourceById } from '../shared/queries';
import { processDataSourceFile } from '../services/processor.service';
import { logger } from '../../../utils/logger';

const paramsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

async function reprocessDataSource(id: number): Promise<void> {
  const dataSource = await findDataSourceById(id);

  if (!dataSource) {
    throw new HttpException(404, 'Data source not found');
  }

  // Trigger processing (runs in background)
  processDataSourceFile(id).catch(error => {
    logger.error(`Reprocessing failed for data source ${id}:`, error);
  });
}

const handler = asyncHandler(async (req: any, res: Response) => {
  const { id } = req.params;

  await reprocessDataSource(parseInt(id));

  ResponseFormatter.success(res, null, 'Data source processing started. Status will be updated shortly.');
});

const router = Router();

router.post(
  '/:id/reprocess',
  requireAuth,
  requireRole(['admin', 'scientist']),
  validationMiddleware(paramsSchema, 'params'),
  handler
);

export default router;
