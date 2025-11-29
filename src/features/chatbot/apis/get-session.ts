/**
 * Get Session API
 *
 * GET /api/chatbot/sessions/:id
 *
 * Get a specific chat session with all its messages.
 */

import { Router, Response, Request } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../../middlewares/auth.middleware';
import { ResponseFormatter } from '../../../utils/responseFormatter';
import { asyncHandler } from '../../../utils/controllerHelpers';
import HttpException from '../../../utils/httpException';
import { getSessionByIdForUser, getSessionMessages } from '../shared/queries';

// Params schema
const paramsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

// Query params schema
const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

/**
 * Get session handler
 */
const handler = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const { id } = paramsSchema.parse(req.params);
  const { page, limit } = querySchema.parse(req.query);

  // Get session (verifies ownership)
  const session = await getSessionByIdForUser(id, userId);

  if (!session) {
    throw new HttpException(404, 'Session not found');
  }

  // Get messages for the session
  const { messages, total } = await getSessionMessages(id, page, limit);

  ResponseFormatter.success(
    res,
    {
      session: {
        id: session.id,
        title: session.title || 'New Chat',
        createdAt: session.created_at,
        updatedAt: session.updated_at,
      },
      messages: messages.map(msg => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        sources: msg.sources,
        createdAt: msg.created_at,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    },
    'Session retrieved successfully'
  );
});

const router = Router();

// GET /api/chatbot/sessions/:id - Get session with messages (all authenticated users)
router.get('/sessions/:id', requireAuth, handler);

export default router;
