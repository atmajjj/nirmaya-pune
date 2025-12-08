/**
 * Send Message API
 *
 * POST /api/chatbot/chat
 *
 * Send a message to NIRA AI and receive a response.
 * Creates a new session if sessionId is not provided.
 */

import { Router, Response, Request } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../../middlewares/auth.middleware';
import validationMiddleware from '../../../middlewares/validation.middleware';
import { ResponseFormatter } from '../../../utils/responseFormatter';
import { asyncHandler } from '../../../utils/controllerHelpers';
import HttpException from '../../../utils/httpException';
import { logger } from '../../../utils/logger';
import {
  createSession,
  getSessionByIdForUser,
  updateSessionTimestamp,
  updateSessionTitle,
  createMessage,
  getRecentMessages,
} from '../shared/queries';
import {
  generateChatResponse,
  generateSessionTitle,
} from '../services/chat.service';
import { MessageSource } from '../shared/schema';

// Request body schema
const sendMessageSchema = z.object({
  message: z.string().min(1).max(10000),
  sessionId: z.number().int().positive().optional(),
});

/**
 * Send message handler
 */
const handler = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const { message, sessionId } = sendMessageSchema.parse(req.body);

  let session;
  let isNewSession = false;

  // Get or create session
  if (sessionId) {
    session = await getSessionByIdForUser(sessionId, userId);
    if (!session) {
      throw new HttpException(404, 'Session not found');
    }
  } else {
    // Create new session
    session = await createSession({
      user_id: userId,
      title: null, // Will be set after first message
      created_by: userId,
    });
    isNewSession = true;
    logger.info(`📝 Created new chat session ${session.id} for user ${userId}`);
  }

  // Store user message
  const userMessage = await createMessage({
    session_id: session.id,
    role: 'user',
    content: message,
    sources: null,
    created_by: userId,
  });

  let responseText: string;
  let sources: MessageSource[] = [];

  // Get conversation history for context
  const recentMessages = await getRecentMessages(session.id, 10);
  const conversationHistory = recentMessages
    .filter(m => m.id !== userMessage.id) // Exclude the message we just created
    .map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

  // Generate response using LLM (includes search internally)
  logger.info(`🤖 Generating response for session ${session.id}`);
  const response = await generateChatResponse(message, conversationHistory);
  responseText = response.message;
  sources = response.sources;

  // Store assistant message
  const assistantMessage = await createMessage({
    session_id: session.id,
    role: 'assistant',
    content: responseText,
    sources: sources.length > 0 ? sources : null,
    created_by: userId,
  });

  // Update session timestamp
  await updateSessionTimestamp(session.id);

  // Generate and set session title if this is a new session
  if (isNewSession) {
    const title = await generateSessionTitle(message);
    await updateSessionTitle(session.id, title);
    session.title = title;
  }

  ResponseFormatter.success(
    res,
    {
      sessionId: session.id,
      sessionTitle: session.title,
      userMessage: {
        id: userMessage.id,
        role: userMessage.role,
        content: userMessage.content,
        createdAt: userMessage.created_at,
      },
      assistantMessage: {
        id: assistantMessage.id,
        role: assistantMessage.role,
        content: assistantMessage.content,
        sources: assistantMessage.sources,
        createdAt: assistantMessage.created_at,
      },
    },
    'Message sent successfully'
  );
});

const router = Router();

// POST /api/chatbot/chat - Send message (all authenticated users)
router.post('/chat', requireAuth, validationMiddleware(sendMessageSchema), handler);

export default router;
