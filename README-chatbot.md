# NIRA AI Chatbot - Implementation Guide

A simplified RAG (Retrieval-Augmented Generation) chatbot feature for the Nirmaya backend.

## Overview

**NIRA AI** is a single, unified AI assistant that answers questions based on uploaded documents. It uses:
- **Groq API** for LLM responses
- **Pinecone** for vector storage
- **HuggingFace BGE-M3** for embeddings
- **PDF.js, mammoth** for document parsing

## Architecture

```
User uploads document (Admin only)
         ↓
    S3 Storage → Extract Text → Chunk → Embed → Pinecone
                                                    ↓
User asks question (All roles)                     ↓
         ↓                                         ↓
    Embed Query → Hybrid Search in Pinecone ←──────┘
         ↓
    Build Context + System Prompt
         ↓
    Groq LLM → Response to User
```

## Feature Specifications

| Spec | Value |
|------|-------|
| Feature Name | `chatbot` |
| Namespace | Single global (`nira-global`) |
| File Types | PDF, TXT, DOCX, MD |
| Max File Size | 20MB |
| LLM Provider | Groq |
| Default Model | `llama-3.3-70b-versatile` |
| Embedding Model | BAAI/bge-m3 (1024 dimensions) |
| Vector DB | Pinecone |
| Chat History | Last 5 messages |
| Response Type | Standard JSON (no streaming) |

## Access Control

| Endpoint | Admin | Scientist | Researcher | Policymaker |
|----------|-------|-----------|------------|-------------|
| Upload Document | ✅ | ❌ | ❌ | ❌ |
| List Documents | ✅ | ❌ | ❌ | ❌ |
| Delete Document | ✅ | ❌ | ❌ | ❌ |
| Chat | ✅ | ✅ | ✅ | ✅ |
| View Sessions | ✅ | ✅ | ✅ | ✅ |
| View Chat History | ✅ | ✅ | ✅ | ✅ |
| Delete Own Session | ✅ | ✅ | ✅ | ✅ |

## Rate Limits

| Endpoint | Limit |
|----------|-------|
| Chat | 30 requests/minute per user |
| Document Upload | 10 requests/hour per user |
| Other endpoints | 60 requests/minute per user |

---

## Environment Variables

Add these to `.env.dev`, `.env.test`, and `.env.prod`:

```env
# Chatbot - Groq LLM
GROQ_API_KEY=gsk_xxxxx

# Chatbot - Pinecone Vector DB
PINECONE_API_KEY=pcsk_xxxxx
PINECONE_INDEX_NAME=nira

# Chatbot - HuggingFace Embeddings
HUGGINGFACE_TOKEN=hf_xxxxx
```

---

## Folder Structure

```
src/features/chatbot/
├── apis/
│   ├── chat.ts                    # POST /chatbot/chat
│   ├── upload-document.ts         # POST /chatbot/documents
│   ├── list-documents.ts          # GET /chatbot/documents
│   ├── delete-document.ts         # DELETE /chatbot/documents/:id
│   ├── get-sessions.ts            # GET /chatbot/sessions
│   ├── get-chat-history.ts        # GET /chatbot/sessions/:id/messages
│   └── delete-session.ts          # DELETE /chatbot/sessions/:id
├── shared/
│   ├── schema.ts                  # Drizzle table definitions
│   ├── queries.ts                 # Reusable DB queries
│   └── interface.ts               # TypeScript interfaces
├── services/
│   ├── pinecone.service.ts        # Pinecone connection & operations
│   ├── embedding.service.ts       # BGE-M3 embedding generation
│   ├── document-processor.service.ts  # PDF/DOCX/TXT/MD parsing
│   ├── chunker.service.ts         # Text chunking logic
│   ├── vector.service.ts          # Vector CRUD operations
│   ├── search.service.ts          # Semantic search
│   └── chat.service.ts            # LLM interaction & response
├── config/
│   └── chatbot.config.ts          # All chatbot configuration
└── index.ts                       # Feature router
```

---

## Implementation Phases

### Phase 1: Foundation Setup
**Goal:** Set up database, config, and basic infrastructure

#### Step 1.1: Update Environment Validation
- [ ] Add chatbot env variables to `validateEnv.ts`
- [ ] Add variables to `.env.example`

#### Step 1.2: Create Database Schema
- [ ] Create `src/features/chatbot/shared/schema.ts`
  - `chatbot_documents` table (document metadata)
  - `chatbot_sessions` table (user chat sessions)
  - `chatbot_messages` table (chat messages)

#### Step 1.3: Create Configuration
- [ ] Create `src/features/chatbot/config/chatbot.config.ts`
  - Chunking settings
  - Embedding settings
  - Search settings
  - LLM settings

#### Step 1.4: Create Interfaces
- [ ] Create `src/features/chatbot/shared/interface.ts`
  - Document interfaces
  - Chat interfaces
  - Vector interfaces

#### Step 1.5: Generate Migration
- [ ] Run `npm run db:generate`
- [ ] Run `npm run db:migrate`

---

### Phase 2: Core Services
**Goal:** Implement the AI/ML services

#### Step 2.1: Pinecone Service
- [ ] Create `src/features/chatbot/services/pinecone.service.ts`
  - Initialize Pinecone client
  - Connect to index
  - Health check method

#### Step 2.2: Embedding Service
- [ ] Create `src/features/chatbot/services/embedding.service.ts`
  - HuggingFace BGE-M3 integration
  - Single text embedding
  - Batch text embedding
  - Retry logic

#### Step 2.3: Document Processor Service
- [ ] Create `src/features/chatbot/services/document-processor.service.ts`
  - PDF parsing (pdf.js)
  - DOCX parsing (mammoth)
  - TXT/MD parsing (direct read)
  - Text extraction pipeline

#### Step 2.4: Chunker Service
- [ ] Create `src/features/chatbot/services/chunker.service.ts`
  - Semantic chunking
  - Chunk size optimization (400-1200 chars)
  - Overlap handling (25%)

#### Step 2.5: Vector Service
- [ ] Create `src/features/chatbot/services/vector.service.ts`
  - Upsert vectors
  - Delete vectors by document ID
  - Get vector stats

#### Step 2.6: Search Service
- [ ] Create `src/features/chatbot/services/search.service.ts`
  - Hybrid search (dense + sparse)
  - Result ranking
  - Context building

#### Step 2.7: Chat Service
- [ ] Create `src/features/chatbot/services/chat.service.ts`
  - Groq LLM integration
  - System prompt generation
  - Context injection
  - Response generation

---

### Phase 3: Database Queries
**Goal:** Create reusable database operations

#### Step 3.1: Document Queries
- [ ] Create document CRUD in `queries.ts`
  - `createDocument()`
  - `getDocumentById()`
  - `listDocuments()`
  - `deleteDocument()`
  - `updateDocumentStatus()`

#### Step 3.2: Session Queries
- [ ] Create session CRUD in `queries.ts`
  - `createSession()`
  - `getSessionById()`
  - `listUserSessions()`
  - `deleteSession()`

#### Step 3.3: Message Queries
- [ ] Create message CRUD in `queries.ts`
  - `createMessage()`
  - `getSessionMessages()`
  - `getRecentMessages()` (last 5)

---

### Phase 4: API Endpoints
**Goal:** Implement all REST endpoints

#### Step 4.1: Upload Document API
- [ ] Create `src/features/chatbot/apis/upload-document.ts`
  - Multer file upload
  - File validation (type, size)
  - S3 upload
  - Auto-training pipeline
  - Admin only

#### Step 4.2: List Documents API
- [ ] Create `src/features/chatbot/apis/list-documents.ts`
  - Paginated list
  - Status filter
  - Admin only

#### Step 4.3: Delete Document API
- [ ] Create `src/features/chatbot/apis/delete-document.ts`
  - Soft delete document
  - Remove vectors from Pinecone
  - Admin only

#### Step 4.4: Chat API
- [ ] Create `src/features/chatbot/apis/chat.ts`
  - Message validation
  - Session management (create/continue)
  - Context retrieval
  - LLM response
  - All roles

#### Step 4.5: Get Sessions API
- [ ] Create `src/features/chatbot/apis/get-sessions.ts`
  - User's sessions only
  - Summary info
  - All roles

#### Step 4.6: Get Chat History API
- [ ] Create `src/features/chatbot/apis/get-chat-history.ts`
  - Session messages
  - User ownership check
  - All roles

#### Step 4.7: Delete Session API
- [ ] Create `src/features/chatbot/apis/delete-session.ts`
  - User ownership check
  - Soft delete
  - All roles

---

### Phase 5: Integration & Testing
**Goal:** Connect everything and verify

#### Step 5.1: Feature Router
- [ ] Create `src/features/chatbot/index.ts`
  - Combine all API routers
  - Apply rate limiting

#### Step 5.2: Register Feature
- [ ] Add chatbot routes to `src/server.ts`

#### Step 5.3: Install Dependencies
- [ ] Add required npm packages:
  ```bash
  npm install @pinecone-database/pinecone @huggingface/inference @ai-sdk/groq ai pdfjs-dist mammoth
  ```

#### Step 5.4: Manual Testing
- [ ] Test document upload flow
- [ ] Test chat flow
- [ ] Test session management
- [ ] Test error handling

---

## API Endpoints Reference

### Documents (Admin Only)

#### Upload Document
```
POST /api/chatbot/documents
Content-Type: multipart/form-data

Body:
- file: File (PDF/DOCX/TXT/MD, max 20MB)
- name: string (optional, defaults to filename)
- description: string (optional)

Response: 201
{
  "success": true,
  "message": "Document uploaded and training started",
  "data": {
    "id": 1,
    "name": "Research Paper",
    "status": "processing",
    "file_url": "..."
  }
}
```

#### List Documents
```
GET /api/chatbot/documents?page=1&limit=10&status=completed

Response: 200
{
  "success": true,
  "data": [...],
  "pagination": { "page": 1, "limit": 10, "total": 25 }
}
```

#### Delete Document
```
DELETE /api/chatbot/documents/:id

Response: 204
```

### Chat (All Roles)

#### Send Message
```
POST /api/chatbot/chat
Content-Type: application/json

Body:
{
  "message": "What is the main finding of the research?",
  "sessionId": 123  // optional, creates new session if not provided
}

Response: 200
{
  "success": true,
  "data": {
    "sessionId": 123,
    "message": "Based on the documents...",
    "sources": [
      { "documentId": 1, "documentName": "Research Paper", "relevance": 0.92 }
    ]
  }
}
```

### Sessions (All Roles)

#### Get User Sessions
```
GET /api/chatbot/sessions?page=1&limit=10

Response: 200
{
  "success": true,
  "data": [
    {
      "id": 123,
      "title": "Research questions",
      "messageCount": 5,
      "lastMessageAt": "2025-11-29T10:00:00Z"
    }
  ]
}
```

#### Get Chat History
```
GET /api/chatbot/sessions/:id/messages

Response: 200
{
  "success": true,
  "data": {
    "sessionId": 123,
    "messages": [
      { "role": "user", "content": "...", "createdAt": "..." },
      { "role": "assistant", "content": "...", "createdAt": "..." }
    ]
  }
}
```

#### Delete Session
```
DELETE /api/chatbot/sessions/:id

Response: 204
```

---

## Database Schema

### chatbot_documents
```sql
CREATE TABLE chatbot_documents (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',  -- pending, processing, completed, failed
  chunk_count INTEGER DEFAULT 0,
  vector_ids TEXT[],  -- Array of Pinecone vector IDs
  error_message TEXT,
  -- Audit fields
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_by INTEGER,
  updated_at TIMESTAMP DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_by INTEGER,
  deleted_at TIMESTAMP
);
```

### chatbot_sessions
```sql
CREATE TABLE chatbot_sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) NOT NULL,
  title VARCHAR(255),
  -- Audit fields
  created_by INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_by INTEGER,
  updated_at TIMESTAMP DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_by INTEGER,
  deleted_at TIMESTAMP
);
```

### chatbot_messages
```sql
CREATE TABLE chatbot_messages (
  id SERIAL PRIMARY KEY,
  session_id INTEGER REFERENCES chatbot_sessions(id) NOT NULL,
  role VARCHAR(20) NOT NULL,  -- 'user' or 'assistant'
  content TEXT NOT NULL,
  sources JSONB,  -- Referenced document sources
  -- Audit fields
  created_by INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_by INTEGER,
  updated_at TIMESTAMP DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_by INTEGER,
  deleted_at TIMESTAMP
);
```

---

## System Prompt

```
You are NIRA AI, a helpful assistant for the Nirmaya platform. Your purpose is to answer questions based on the provided context from uploaded documents.

Guidelines:
1. Only answer questions based on the provided context
2. If the context doesn't contain relevant information, politely say so
3. Be concise but thorough in your responses
4. Cite which document(s) your answer is based on when possible
5. If asked about topics outside the documents, explain that you can only answer questions about the uploaded content
6. Be professional and helpful

Context from documents:
{context}

Remember: Only use information from the provided context above.
```

---

## Quick Start Commands

```bash
# 1. Install dependencies
npm install @pinecone-database/pinecone @huggingface/inference @ai-sdk/groq ai pdfjs-dist mammoth

# 2. Add env variables to .env.dev, .env.test, .env.prod

# 3. Generate and run migrations
npm run db:generate
npm run db:migrate

# 4. Start development server
npm run dev
```

---

## Checklist Summary

- [ ] **Phase 1:** Foundation (5 steps)
- [ ] **Phase 2:** Core Services (7 steps)
- [ ] **Phase 3:** Database Queries (3 steps)
- [ ] **Phase 4:** API Endpoints (7 steps)
- [ ] **Phase 5:** Integration (4 steps)

**Total: 26 atomic steps**
