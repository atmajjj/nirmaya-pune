/**
 * List Documents API
 *
 * GET /api/chatbot/documents
 *
 * Admin-only endpoint to list all uploaded documents with pagination.
 */

import { Router, Response, Request } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../../middlewares/auth.middleware';
import { requireRole } from '../../../middlewares/role.middleware';
import { ResponseFormatter } from '../../../utils/responseFormatter';
import { asyncHandler } from '../../../utils/controllerHelpers';
import { listDocuments, getDocumentStats } from '../shared/queries';

// Query params schema
const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

/**
 * List documents handler
 */
const handler = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit } = querySchema.parse(req.query);

  const { documents, total } = await listDocuments(page, limit);

  ResponseFormatter.paginated(
    res,
    documents.map(doc => ({
      id: doc.id,
      name: doc.name,
      description: doc.description,
      fileSize: doc.file_size,
      mimeType: doc.mime_type,
      status: doc.status,
      chunkCount: doc.chunk_count,
      errorMessage: doc.error_message,
      createdAt: doc.created_at,
      updatedAt: doc.updated_at,
    })),
    { page, limit, total },
    'Documents retrieved successfully'
  );
});

/**
 * Get document stats handler
 */
const statsHandler = asyncHandler(async (_req: Request, res: Response) => {
  const stats = await getDocumentStats();

  ResponseFormatter.success(res, stats, 'Document statistics retrieved successfully');
});

const router = Router();

// GET /api/chatbot/documents - List documents (admin only)
router.get('/documents', requireAuth, requireRole('admin'), handler);

// GET /api/chatbot/documents/stats - Get document statistics (admin only)
router.get('/documents/stats', requireAuth, requireRole('admin'), statsHandler);

export default router;
