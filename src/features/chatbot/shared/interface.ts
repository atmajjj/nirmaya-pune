/**
 * NIRA AI Chatbot Interfaces
 *
 * TypeScript interfaces for the chatbot feature.
 */

import { DocumentStatus, MessageRole, MessageSource as SchemaMessageSource } from './schema';

// Re-export MessageSource from schema
export type MessageSource = SchemaMessageSource;

// ========================
// DOCUMENT INTERFACES
// ========================

export interface IDocument {
  id: number;
  name: string;
  description: string | null;
  file_url: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  status: DocumentStatus;
  chunk_count: number;
  is_embedded: boolean;
  error_message: string | null;
  created_by: number | null;
  created_at: Date;
  updated_at: Date;
  is_deleted: boolean;
}

export interface IDocumentCreate {
  name: string;
  description?: string;
  file_url: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  created_by: number;
}

export interface IDocumentUpdate {
  name?: string;
  description?: string;
  status?: DocumentStatus;
  chunk_count?: number;
  is_embedded?: boolean;
  error_message?: string;
  updated_by: number;
}

// ========================
// SESSION INTERFACES
// ========================

export interface ISession {
  id: number;
  user_id: number;
  title: string | null;
  created_at: Date;
  updated_at: Date;
  is_deleted: boolean;
}

export interface ISessionCreate {
  user_id: number;
  title?: string;
  created_by: number;
}

export interface ISessionWithSummary extends ISession {
  message_count: number;
  last_message_at: Date | null;
  last_message_preview: string | null;
}

// ========================
// MESSAGE INTERFACES
// ========================

export interface IMessage {
  id: number;
  session_id: number;
  role: MessageRole;
  content: string;
  sources: MessageSource[] | null;
  created_at: Date;
  is_deleted: boolean;
}

export interface IMessageCreate {
  session_id: number;
  role: MessageRole;
  content: string;
  sources?: MessageSource[];
  created_by: number;
}

// ========================
// CHAT INTERFACES
// ========================

export interface IChatRequest {
  message: string;
  sessionId?: number;
}

export interface IChatResponse {
  sessionId: number;
  message: string;
  sources: MessageSource[];
}

// ========================
// VECTOR INTERFACES
// ========================

export interface IVectorRecord {
  id: string;
  values: number[];
  metadata: IVectorMetadata;
}

export interface IVectorMetadata {
  documentId: number;
  documentName: string;
  chunkIndex: number;
  totalChunks: number;
  text: string;
  mimeType: string;
}

export interface ISearchResult {
  id: string;
  score: number;
  text: string;
  metadata: IVectorMetadata;
}

// ========================
// CHUNK INTERFACES
// ========================

export interface IChunk {
  text: string;
  index: number;
  startPosition: number;
  endPosition: number;
}

export interface IChunkingResult {
  chunks: IChunk[];
  totalChunks: number;
  originalLength: number;
}

// ========================
// TRAINING INTERFACES
// ========================

export interface ITrainingResult {
  documentId: number;
  chunkCount: number;
  vectorIds: string[];
  success: boolean;
  error?: string;
}

// ========================
// API RESPONSE INTERFACES
// ========================

export interface IDocumentListResponse {
  documents: IDocument[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ISessionListResponse {
  sessions: ISessionWithSummary[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface IChatHistoryResponse {
  sessionId: number;
  messages: Array<{
    role: MessageRole;
    content: string;
    sources: MessageSource[] | null;
    createdAt: Date;
  }>;
}
