import {
  pgTable,
  serial,
  text,
  timestamp,
  boolean,
  integer,
  bigint,
  index,
  varchar,
  jsonb,
} from 'drizzle-orm/pg-core';
import { users } from '../../user/shared/schema';

/**
 * Document status enum values
 */
export const documentStatuses = ['pending', 'processing', 'completed', 'failed'] as const;
export type DocumentStatus = (typeof documentStatuses)[number];

/**
 * Message role enum values
 */
export const messageRoles = ['user', 'assistant'] as const;
export type MessageRole = (typeof messageRoles)[number];

/**
 * Chatbot Documents table schema
 * Stores uploaded document metadata and training status
 *
 * Indexes:
 * - status_is_deleted_idx: For filtering by status
 * - created_at_idx: For sorting/pagination
 */
export const chatbotDocuments = pgTable(
  'chatbot_documents',
  {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    file_url: text('file_url').notNull(),
    file_path: text('file_path').notNull(),
    file_size: bigint('file_size', { mode: 'number' }).notNull(),
    mime_type: varchar('mime_type', { length: 100 }).notNull(),
    status: text('status').$type<DocumentStatus>().default('pending').notNull(),
    chunk_count: integer('chunk_count').default(0).notNull(),
    is_embedded: boolean('is_embedded').default(false).notNull(), // Track if content is vectorized
    error_message: text('error_message'),
    // Audit fields
    created_by: integer('created_by').references(() => users.id),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_by: integer('updated_by'),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
    is_deleted: boolean('is_deleted').default(false).notNull(),
    deleted_by: integer('deleted_by'),
    deleted_at: timestamp('deleted_at'),
  },
  table => ({
    // For filtering by status
    statusIsDeletedIdx: index('chatbot_documents_status_is_deleted_idx').on(
      table.status,
      table.is_deleted
    ),
    // For sorting/pagination
    createdAtIdx: index('chatbot_documents_created_at_idx').on(table.created_at),
  })
);

/**
 * Chatbot Sessions table schema
 * Stores user chat sessions
 *
 * Indexes:
 * - user_id_is_deleted_idx: For user's sessions lookup
 * - created_at_idx: For sorting/pagination
 */
export const chatbotSessions = pgTable(
  'chatbot_sessions',
  {
    id: serial('id').primaryKey(),
    user_id: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 255 }),
    // Audit fields
    created_by: integer('created_by'),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_by: integer('updated_by'),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
    is_deleted: boolean('is_deleted').default(false).notNull(),
    deleted_by: integer('deleted_by'),
    deleted_at: timestamp('deleted_at'),
  },
  table => ({
    // For user's sessions lookup
    userIdIsDeletedIdx: index('chatbot_sessions_user_id_is_deleted_idx').on(
      table.user_id,
      table.is_deleted
    ),
    // For sorting/pagination
    createdAtIdx: index('chatbot_sessions_created_at_idx').on(table.created_at),
  })
);

/**
 * Source reference type for messages
 */
export interface MessageSource {
  documentId: number;
  documentName: string;
  relevance: number;
}

/**
 * Chatbot Messages table schema
 * Stores chat messages within sessions
 *
 * Indexes:
 * - session_id_is_deleted_idx: For session messages lookup
 * - created_at_idx: For sorting messages chronologically
 */
export const chatbotMessages = pgTable(
  'chatbot_messages',
  {
    id: serial('id').primaryKey(),
    session_id: integer('session_id')
      .notNull()
      .references(() => chatbotSessions.id, { onDelete: 'cascade' }),
    role: text('role').$type<MessageRole>().notNull(),
    content: text('content').notNull(),
    sources: jsonb('sources').$type<MessageSource[]>(), // Referenced document sources
    // Audit fields
    created_by: integer('created_by'),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_by: integer('updated_by'),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
    is_deleted: boolean('is_deleted').default(false).notNull(),
    deleted_by: integer('deleted_by'),
    deleted_at: timestamp('deleted_at'),
  },
  table => ({
    // For session messages lookup
    sessionIdIsDeletedIdx: index('chatbot_messages_session_id_is_deleted_idx').on(
      table.session_id,
      table.is_deleted
    ),
    // For sorting messages chronologically
    createdAtIdx: index('chatbot_messages_created_at_idx').on(table.created_at),
  })
);

// Export types for TypeScript
export type ChatbotDocument = typeof chatbotDocuments.$inferSelect;
export type NewChatbotDocument = typeof chatbotDocuments.$inferInsert;

export type ChatbotSession = typeof chatbotSessions.$inferSelect;
export type NewChatbotSession = typeof chatbotSessions.$inferInsert;

export type ChatbotMessage = typeof chatbotMessages.$inferSelect;
export type NewChatbotMessage = typeof chatbotMessages.$inferInsert;
