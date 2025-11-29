/**
 * Chatbot Feature Module
 *
 * Combines all chatbot APIs into a single router.
 * Registered at /api/chatbot
 */

import { Router } from 'express';
import Route from '../../interfaces/route.interface';

// Import API routers
import uploadDocumentRouter from './apis/upload-document';
import listDocumentsRouter from './apis/list-documents';
import deleteDocumentRouter from './apis/delete-document';
import sendMessageRouter from './apis/send-message';
import listSessionsRouter from './apis/list-sessions';
import getSessionRouter from './apis/get-session';
import deleteSessionRouter from './apis/delete-session';

/**
 * Chatbot Route
 *
 * Provides NIRA AI chatbot functionality:
 * - Document management (admin)
 * - Chat sessions (all users)
 * - Message exchange with AI
 */
class ChatbotRoute implements Route {
  public path = '/chatbot';
  public router = Router();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    // Document management (admin only)
    this.router.use(this.path, uploadDocumentRouter);   // POST /chatbot/documents
    this.router.use(this.path, listDocumentsRouter);    // GET /chatbot/documents, GET /chatbot/documents/stats
    this.router.use(this.path, deleteDocumentRouter);   // DELETE /chatbot/documents/:id

    // Chat functionality (all authenticated users)
    this.router.use(this.path, sendMessageRouter);      // POST /chatbot/chat
    this.router.use(this.path, listSessionsRouter);     // GET /chatbot/sessions
    this.router.use(this.path, getSessionRouter);       // GET /chatbot/sessions/:id
    this.router.use(this.path, deleteSessionRouter);    // DELETE /chatbot/sessions/:id
  }
}

export default ChatbotRoute;
