/**
 * Chatbot Database Queries
 *
 * Core reusable queries for chatbot operations.
 * Less frequently used queries are in their respective API files.
 */

import { eq, and, desc, asc, sql } from 'drizzle-orm';
import { db } from '../../../database/drizzle';
import {
  chatbotDocuments,
  chatbotSessions,
  chatbotMessages,
  ChatbotDocument,
  ChatbotSession,
  ChatbotMessage,
  NewChatbotDocument,
  NewChatbotSession,
  NewChatbotMessage,
  DocumentStatus,
} from './schema';

// ============================================================================
// DOCUMENT QUERIES (Core)
// ============================================================================

/**
 * Create a new chatbot document record
 */
export async function createDocument(
  data: NewChatbotDocument
): Promise<ChatbotDocument> {
  const [document] = await db.insert(chatbotDocuments).values(data).returning();
  return document;
}

/**
 * Get a document by ID (excluding soft-deleted)
 */
export async function getDocumentById(
  id: number
): Promise<ChatbotDocument | undefined> {
  const [document] = await db
    .select()
    .from(chatbotDocuments)
    .where(and(eq(chatbotDocuments.id, id), eq(chatbotDocuments.is_deleted, false)));
  return document;
}

/**
 * List all documents with pagination (excluding soft-deleted)
 */
export async function listDocuments(
  page: number = 1,
  limit: number = 20
): Promise<{ documents: ChatbotDocument[]; total: number }> {
  const offset = (page - 1) * limit;

  const [documents, countResult] = await Promise.all([
    db
      .select()
      .from(chatbotDocuments)
      .where(eq(chatbotDocuments.is_deleted, false))
      .orderBy(desc(chatbotDocuments.created_at))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(chatbotDocuments)
      .where(eq(chatbotDocuments.is_deleted, false)),
  ]);

  return {
    documents,
    total: countResult[0]?.count || 0,
  };
}

/**
 * Update document status
 */
export async function updateDocumentStatus(
  id: number,
  status: DocumentStatus,
  updatedBy: number,
  errorMessage?: string
): Promise<ChatbotDocument | undefined> {
  const updateData: {
    status: DocumentStatus;
    updated_by: number;
    updated_at: Date;
    error_message?: string | null;
    is_embedded?: boolean;
  } = {
    status,
    updated_by: updatedBy,
    updated_at: new Date(),
  };

  if (errorMessage !== undefined) {
    updateData.error_message = errorMessage;
  }

  // Mark as embedded when completed
  if (status === 'completed') {
    updateData.is_embedded = true;
  }

  const [document] = await db
    .update(chatbotDocuments)
    .set(updateData)
    .where(eq(chatbotDocuments.id, id))
    .returning();

  return document;
}

/**
 * Update document after successful processing
 */
export async function updateDocumentProcessingResult(
  id: number,
  chunkCount: number,
  updatedBy: number
): Promise<ChatbotDocument | undefined> {
  const [document] = await db
    .update(chatbotDocuments)
    .set({
      chunk_count: chunkCount,
      is_embedded: true,
      updated_by: updatedBy,
      updated_at: new Date(),
    })
    .where(eq(chatbotDocuments.id, id))
    .returning();

  return document;
}

/**
 * Soft delete a document
 */
export async function deleteDocument(
  id: number,
  deletedBy: number
): Promise<ChatbotDocument | undefined> {
  const [document] = await db
    .update(chatbotDocuments)
    .set({
      is_deleted: true,
      is_embedded: false, // Mark as not embedded when deleted
      deleted_by: deletedBy,
      deleted_at: new Date(),
    })
    .where(eq(chatbotDocuments.id, id))
    .returning();

  return document;
}

/**
 * Get document statistics
 */
export async function getDocumentStats(): Promise<{
  total: number;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  totalChunks: number;
}> {
  const [result] = await db
    .select({
      total: sql<number>`count(*)::int`,
      pending: sql<number>`count(*) filter (where ${chatbotDocuments.status} = 'pending')::int`,
      processing: sql<number>`count(*) filter (where ${chatbotDocuments.status} = 'processing')::int`,
      completed: sql<number>`count(*) filter (where ${chatbotDocuments.status} = 'completed')::int`,
      failed: sql<number>`count(*) filter (where ${chatbotDocuments.status} = 'failed')::int`,
      totalChunks: sql<number>`coalesce(sum(${chatbotDocuments.chunk_count}), 0)::int`,
    })
    .from(chatbotDocuments)
    .where(eq(chatbotDocuments.is_deleted, false));

  return {
    total: result?.total || 0,
    pending: result?.pending || 0,
    processing: result?.processing || 0,
    completed: result?.completed || 0,
    failed: result?.failed || 0,
    totalChunks: result?.totalChunks || 0,
  };
}

// ============================================================================
// SESSION QUERIES (Core)
// ============================================================================

/**
 * Create a new chat session
 */
export async function createSession(
  data: NewChatbotSession
): Promise<ChatbotSession> {
  const [session] = await db.insert(chatbotSessions).values(data).returning();
  return session;
}

/**
 * Get a session by ID for a specific user
 */
export async function getSessionByIdForUser(
  id: number,
  userId: number
): Promise<ChatbotSession | undefined> {
  const [session] = await db
    .select()
    .from(chatbotSessions)
    .where(
      and(
        eq(chatbotSessions.id, id),
        eq(chatbotSessions.user_id, userId),
        eq(chatbotSessions.is_deleted, false)
      )
    );
  return session;
}

/**
 * List sessions for a user with pagination
 */
export async function listUserSessions(
  userId: number,
  page: number = 1,
  limit: number = 20
): Promise<{ sessions: ChatbotSession[]; total: number }> {
  const offset = (page - 1) * limit;

  const [sessions, countResult] = await Promise.all([
    db
      .select()
      .from(chatbotSessions)
      .where(and(eq(chatbotSessions.user_id, userId), eq(chatbotSessions.is_deleted, false)))
      .orderBy(desc(chatbotSessions.updated_at))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(chatbotSessions)
      .where(and(eq(chatbotSessions.user_id, userId), eq(chatbotSessions.is_deleted, false))),
  ]);

  return {
    sessions,
    total: countResult[0]?.count || 0,
  };
}

/**
 * Update session timestamp and title
 */
export async function updateSessionTimestamp(
  id: number
): Promise<ChatbotSession | undefined> {
  const [session] = await db
    .update(chatbotSessions)
    .set({ updated_at: new Date() })
    .where(eq(chatbotSessions.id, id))
    .returning();

  return session;
}

/**
 * Update session title
 */
export async function updateSessionTitle(
  id: number,
  title: string
): Promise<ChatbotSession | undefined> {
  const [session] = await db
    .update(chatbotSessions)
    .set({ title, updated_at: new Date() })
    .where(eq(chatbotSessions.id, id))
    .returning();

  return session;
}

/**
 * Soft delete a session and all its messages
 */
export async function deleteSession(
  id: number,
  deletedBy: number
): Promise<ChatbotSession | undefined> {
  // First soft-delete all messages in the session
  await db
    .update(chatbotMessages)
    .set({
      is_deleted: true,
      deleted_by: deletedBy,
      deleted_at: new Date(),
    })
    .where(and(eq(chatbotMessages.session_id, id), eq(chatbotMessages.is_deleted, false)));

  // Then soft-delete the session itself
  const [session] = await db
    .update(chatbotSessions)
    .set({
      is_deleted: true,
      deleted_by: deletedBy,
      deleted_at: new Date(),
    })
    .where(eq(chatbotSessions.id, id))
    .returning();

  return session;
}

// ============================================================================
// MESSAGE QUERIES (Core)
// ============================================================================

/**
 * Create a new message
 */
export async function createMessage(
  data: NewChatbotMessage
): Promise<ChatbotMessage> {
  const [message] = await db.insert(chatbotMessages).values(data).returning();
  return message;
}

/**
 * Get messages for a session with pagination
 */
export async function getSessionMessages(
  sessionId: number,
  page: number = 1,
  limit: number = 50
): Promise<{ messages: ChatbotMessage[]; total: number }> {
  const offset = (page - 1) * limit;

  const [messages, countResult] = await Promise.all([
    db
      .select()
      .from(chatbotMessages)
      .where(and(eq(chatbotMessages.session_id, sessionId), eq(chatbotMessages.is_deleted, false)))
      .orderBy(asc(chatbotMessages.created_at))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(chatbotMessages)
      .where(and(eq(chatbotMessages.session_id, sessionId), eq(chatbotMessages.is_deleted, false))),
  ]);

  return {
    messages,
    total: countResult[0]?.count || 0,
  };
}

/**
 * Get recent messages for a session (for conversation context)
 */
export async function getRecentMessages(
  sessionId: number,
  count: number = 10
): Promise<ChatbotMessage[]> {
  const messages = await db
    .select()
    .from(chatbotMessages)
    .where(and(eq(chatbotMessages.session_id, sessionId), eq(chatbotMessages.is_deleted, false)))
    .orderBy(desc(chatbotMessages.created_at))
    .limit(count);

  return messages.reverse();
}
