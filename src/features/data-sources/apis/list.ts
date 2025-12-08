import { Router, Response } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../../middlewares/auth.middleware';
import validationMiddleware from '../../../middlewares/validation.middleware';
import { ResponseFormatter } from '../../../utils/responseFormatter';
import { asyncHandler } from '../../../utils/controllerHelpers';
import { listDataSources } from '../shared/queries';
import { ListDataSourcesQuery, PaginatedDataSourcesResponse, DataSourceResponse } from '../shared/interface';

const querySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  status: z.enum(['pending', 'available', 'processing', 'archived', 'failed']).optional(),
  file_type: z.enum(['csv', 'xlsx', 'xls']).optional(),
  uploaded_by: z.coerce.number().int().positive().optional(),
  search: z.string().optional(),
  sort_by: z.enum(['created_at', 'filename', 'file_size']).default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
});

async function getDataSources(query: ListDataSourcesQuery): Promise<PaginatedDataSourcesResponse> {
  const { data, total } = await listDataSources(query);

  const formattedData: DataSourceResponse[] = data.map(ds => ({
    id: ds.id,
    filename: ds.filename,
    original_filename: ds.original_filename,
    file_type: ds.file_type as 'csv' | 'xlsx' | 'xls',
    mime_type: ds.mime_type,
    file_size: ds.file_size,
    file_url: ds.file_url,
    status: ds.status as 'pending' | 'available' | 'processing' | 'archived' | 'failed',
    error_message: ds.error_message,
    metadata: ds.metadata,
    description: ds.description,
    uploaded_by: ds.uploaded_by,
    uploader: ds.uploader,
    created_at: ds.created_at,
    updated_at: ds.updated_at,
  }));

  const page = query.page || 1;
  const limit = query.limit || 10;

  return {
    data: formattedData,
    pagination: {
      page,
      limit,
      total,
      total_pages: Math.ceil(total / limit),
    },
  };
}

const handler = asyncHandler(async (req: any, res: Response) => {
  const query = req.query as unknown as ListDataSourcesQuery;
  
  // If user is field technician, only show their uploads
  if (req.userRole === 'field_technician') {
    query.uploaded_by = req.userId;
  }

  const result = await getDataSources(query);

  ResponseFormatter.paginated(
    res,
    result.data,
    result.pagination,
    'Data sources retrieved successfully'
  );
});

const router = Router();

router.get('/', requireAuth, validationMiddleware(querySchema, 'query'), handler);

export default router;
