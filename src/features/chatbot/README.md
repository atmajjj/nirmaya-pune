# Chatbot Feature - Frontend Integration Guide

## Overview

The Chatbot feature provides NIRA AI, an intelligent assistant for the Nirmaya platform. It enables users to have conversations with an AI that answers questions based on uploaded documents. The system uses RAG (Retrieval-Augmented Generation) with Pinecone vector storage and Groq LLM.

## Base URL

```
/api/chatbot
```

## Authentication Requirements

| Endpoint | Authentication | Authorization | Description |
|----------|----------------|---------------|-------------|
| `POST /chat` | ✅ Required | All users | Send message to AI |
| `GET /sessions` | ✅ Required | All users | List user's sessions |
| `GET /sessions/:id` | ✅ Required | All users | Get session with messages |
| `DELETE /sessions/:id` | ✅ Required | All users | Delete session |
| `POST /documents` | ✅ Required | Admin only | Upload document for training |
| `GET /documents` | ✅ Required | Admin only | List all documents |
| `GET /documents/stats` | ✅ Required | Admin only | Get document statistics |
| `DELETE /documents/:id` | ✅ Required | Admin only | Delete document |

---

## Chat Endpoints

### 1. Send Message

Send a message to NIRA AI and receive a response. Automatically creates a new session if `sessionId` is not provided.

**Endpoint:** `POST /api/chatbot/chat`

**Authentication:** Required (Bearer Token)

**Authorization:** All authenticated users

#### Request Headers

```http
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

#### Request Body

```json
{
  "message": "What are the key findings from the climate report?",
  "sessionId": 1
}
```

#### Request Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `message` | string | ✅ | User's message (1-10,000 chars) |
| `sessionId` | number | ❌ | Existing session ID. If omitted, creates new session |

#### Success Response

**Status Code:** `200 OK`

```json
{
  "success": true,
  "message": "Message sent successfully",
  "data": {
    "sessionId": 1,
    "sessionTitle": "Climate Report Discussion",
    "isNewSession": false,
    "userMessage": {
      "id": 15,
      "role": "user",
      "content": "What are the key findings from the climate report?",
      "createdAt": "2024-01-15T10:30:00.000Z"
    },
    "assistantMessage": {
      "id": 16,
      "role": "assistant",
      "content": "Based on the uploaded climate report, the key findings are:\n\n1. Global temperatures have risen by 1.2°C since pre-industrial levels\n2. Sea levels are projected to rise 30-60cm by 2100\n3. Extreme weather events have increased by 40%\n\nThese findings are documented in the 'Climate Assessment 2024' report.",
      "sources": [
        {
          "documentId": 5,
          "documentName": "Climate Assessment 2024.pdf",
          "relevance": 0.92
        }
      ],
      "createdAt": "2024-01-15T10:30:02.000Z"
    }
  }
}
```

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `sessionId` | number | Session ID (use for follow-up messages) |
| `sessionTitle` | string | Auto-generated title based on first message |
| `isNewSession` | boolean | Whether a new session was created |
| `userMessage` | object | Stored user message |
| `assistantMessage` | object | AI response with optional sources |
| `assistantMessage.sources` | array | Documents referenced in the response |

#### Error Responses

| Status | Error | Description |
|--------|-------|-------------|
| `400` | Validation Error | Invalid message or session ID |
| `401` | Unauthorized | Missing or invalid JWT token |
| `404` | Not Found | Session ID doesn't exist or belongs to another user |

---

### 2. List Sessions

Get paginated list of user's chat sessions.

**Endpoint:** `GET /api/chatbot/sessions`

**Authentication:** Required (Bearer Token)

#### Request Headers

```http
Authorization: Bearer <jwt_token>
```

#### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | number | `1` | Page number (min: 1) |
| `limit` | number | `20` | Items per page (min: 1, max: 100) |

#### Example Request

```
GET /api/chatbot/sessions?page=1&limit=10
```

#### Success Response

**Status Code:** `200 OK`

```json
{
  "success": true,
  "message": "Sessions retrieved successfully",
  "data": [
    {
      "id": 5,
      "title": "Climate Report Discussion",
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T11:45:00.000Z"
    },
    {
      "id": 3,
      "title": "Health Policy Questions",
      "createdAt": "2024-01-14T09:00:00.000Z",
      "updatedAt": "2024-01-14T09:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 2
  }
}
```

---

### 3. Get Session

Get a specific session with all its messages.

**Endpoint:** `GET /api/chatbot/sessions/:id`

**Authentication:** Required (Bearer Token)

#### Request Headers

```http
Authorization: Bearer <jwt_token>
```

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | number | Session ID |

#### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | number | `1` | Page number for messages |
| `limit` | number | `50` | Messages per page (max: 100) |

#### Success Response

**Status Code:** `200 OK`

```json
{
  "success": true,
  "message": "Session retrieved successfully",
  "data": {
    "session": {
      "id": 5,
      "title": "Climate Report Discussion",
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T11:45:00.000Z"
    },
    "messages": [
      {
        "id": 15,
        "role": "user",
        "content": "What are the key findings from the climate report?",
        "sources": null,
        "createdAt": "2024-01-15T10:30:00.000Z"
      },
      {
        "id": 16,
        "role": "assistant",
        "content": "Based on the uploaded climate report...",
        "sources": [
          {
            "documentId": 5,
            "documentName": "Climate Assessment 2024.pdf",
            "relevance": 0.92
          }
        ],
        "createdAt": "2024-01-15T10:30:02.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 2,
      "totalPages": 1
    }
  }
}
```

#### Error Responses

| Status | Error | Description |
|--------|-------|-------------|
| `401` | Unauthorized | Missing or invalid JWT token |
| `404` | Not Found | Session not found or belongs to another user |

---

### 4. Delete Session

Delete a chat session and all its messages.

**Endpoint:** `DELETE /api/chatbot/sessions/:id`

**Authentication:** Required (Bearer Token)

#### Request Headers

```http
Authorization: Bearer <jwt_token>
```

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | number | Session ID |

#### Success Response

**Status Code:** `204 No Content`

(Empty response body)

#### Error Responses

| Status | Error | Description |
|--------|-------|-------------|
| `401` | Unauthorized | Missing or invalid JWT token |
| `404` | Not Found | Session not found or belongs to another user |

---

## Document Management Endpoints (Admin Only)

### 5. Upload Document

Upload a document for NIRA AI training. The document is processed asynchronously (text extraction, chunking, and vector embedding).

**Endpoint:** `POST /api/chatbot/documents`

**Authentication:** Required (Bearer Token)

**Authorization:** Admin only

#### Request Headers

```http
Authorization: Bearer <jwt_token>
Content-Type: multipart/form-data
```

#### Request Body (Form Data)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | File | ✅ | Document file to upload |
| `name` | string | ❌ | Custom document name (defaults to filename) |
| `description` | string | ❌ | Document description (max 1000 chars) |

#### Supported File Types

| Type | MIME Type | Max Size |
|------|-----------|----------|
| PDF | `application/pdf` | 20 MB |
| Plain Text | `text/plain` | 20 MB |
| Markdown | `text/markdown` | 20 MB |
| Word Document | `application/vnd.openxmlformats-officedocument.wordprocessingml.document` | 20 MB |

#### Success Response

**Status Code:** `201 Created`

```json
{
  "success": true,
  "message": "Document uploaded and processing started",
  "data": {
    "id": 10,
    "name": "Climate Assessment 2024.pdf",
    "description": "Annual climate assessment report",
    "fileSize": 2456789,
    "mimeType": "application/pdf",
    "status": "pending",
    "chunkCount": 0,
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

> **Note:** Processing happens asynchronously. The document status will change from `pending` → `processing` → `completed` (or `failed`).

#### Error Responses

| Status | Error | Description |
|--------|-------|-------------|
| `400` | Bad Request | No file uploaded |
| `400` | Bad Request | Invalid file type |
| `400` | Bad Request | File too large (> 20MB) |
| `401` | Unauthorized | Missing or invalid JWT token |
| `403` | Forbidden | User is not an admin |

---

### 6. List Documents

Get paginated list of all uploaded documents.

**Endpoint:** `GET /api/chatbot/documents`

**Authentication:** Required (Bearer Token)

**Authorization:** Admin only

#### Request Headers

```http
Authorization: Bearer <jwt_token>
```

#### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | number | `1` | Page number (min: 1) |
| `limit` | number | `20` | Items per page (min: 1, max: 100) |

#### Success Response

**Status Code:** `200 OK`

```json
{
  "success": true,
  "message": "Documents retrieved successfully",
  "data": [
    {
      "id": 10,
      "name": "Climate Assessment 2024.pdf",
      "description": "Annual climate assessment report",
      "fileSize": 2456789,
      "mimeType": "application/pdf",
      "status": "completed",
      "chunkCount": 45,
      "errorMessage": null,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:32:00.000Z"
    },
    {
      "id": 9,
      "name": "Policy Guidelines.docx",
      "description": null,
      "fileSize": 156789,
      "mimeType": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "status": "completed",
      "chunkCount": 12,
      "errorMessage": null,
      "createdAt": "2024-01-14T09:00:00.000Z",
      "updatedAt": "2024-01-14T09:01:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 2
  }
}
```

---

### 7. Get Document Statistics

Get statistics about all uploaded documents.

**Endpoint:** `GET /api/chatbot/documents/stats`

**Authentication:** Required (Bearer Token)

**Authorization:** Admin only

#### Request Headers

```http
Authorization: Bearer <jwt_token>
```

#### Success Response

**Status Code:** `200 OK`

```json
{
  "success": true,
  "message": "Document statistics retrieved successfully",
  "data": {
    "totalDocuments": 15,
    "totalChunks": 450,
    "byStatus": {
      "pending": 1,
      "processing": 0,
      "completed": 13,
      "failed": 1
    },
    "totalFileSize": 45678901
  }
}
```

---

### 8. Delete Document

Delete a document and its vectors from the system.

**Endpoint:** `DELETE /api/chatbot/documents/:id`

**Authentication:** Required (Bearer Token)

**Authorization:** Admin only

#### Request Headers

```http
Authorization: Bearer <jwt_token>
```

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | number | Document ID |

#### Success Response

**Status Code:** `204 No Content`

(Empty response body)

#### Error Responses

| Status | Error | Description |
|--------|-------|-------------|
| `401` | Unauthorized | Missing or invalid JWT token |
| `403` | Forbidden | User is not an admin |
| `404` | Not Found | Document not found |

---

## Chat Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        NIRA AI CHAT FLOW                            │
└─────────────────────────────────────────────────────────────────────┘

1. USER STARTS NEW CONVERSATION
   ┌─────────────┐         ┌─────────────┐         ┌─────────────┐
   │   Frontend  │ ──POST──▶│   Backend   │ ─────▶ │   New       │
   │   Chat UI   │  /chat   │  Creates    │        │   Session   │
   │   (no ID)   │  message │  Session    │        │   Created   │
   └─────────────┘          └─────────────┘        └──────┬──────┘
                                                          │
2. MESSAGE PROCESSING                                     ▼
   ┌─────────────────────────────────────────────────────────────────┐
   │                      BACKEND PROCESSING                          │
   │                                                                  │
   │  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐  │
   │  │ Store    │───▶│ Search   │───▶│ Build    │───▶│ Generate │  │
   │  │ User     │    │ Pinecone │    │ Context  │    │ Response │  │
   │  │ Message  │    │ Vectors  │    │ + History│    │ (Groq)   │  │
   │  └──────────┘    └──────────┘    └──────────┘    └──────────┘  │
   │                                                                  │
   └─────────────────────────────────────────────────────────────────┘
                                    │
3. RESPONSE RETURNED                ▼
   ┌─────────────┐         ┌─────────────┐         ┌─────────────┐
   │  Frontend   │◀────────│   Backend   │         │  Assistant  │
   │  Displays   │ Response│  Returns    │◀────────│  Message    │
   │  Message +  │ + Sources│ sessionId  │         │  + Sources  │
   │  Sources    │         │ + messages  │         │             │
   └─────────────┘         └─────────────┘         └─────────────┘

4. FOLLOW-UP MESSAGES (include sessionId)
   ┌─────────────┐         ┌─────────────┐         ┌─────────────┐
   │  Frontend   │ ──POST──▶│   Backend   │        │   Same      │
   │  Chat UI    │  /chat   │  Uses       │ ─────▶ │   Session   │
   │  (with ID)  │  message │  Existing   │        │   Context   │
   │             │  +sessId │  Session    │        │             │
   └─────────────┘          └─────────────┘        └─────────────┘
```

---

## Document Training Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                    DOCUMENT TRAINING PIPELINE                        │
└─────────────────────────────────────────────────────────────────────┘

1. ADMIN UPLOADS DOCUMENT
   ┌─────────────┐         ┌─────────────┐         ┌─────────────┐
   │   Admin     │ ──POST──▶│   Backend   │ ──────▶│   S3        │
   │  Dashboard  │ /documents│ Validates   │ Upload │   Storage   │
   │   Upload    │  (file)  │  + Stores   │        │             │
   └─────────────┘          └─────────────┘        └──────┬──────┘
                                                          │
2. ASYNC PROCESSING STARTS                                ▼
   ┌─────────────────────────────────────────────────────────────────┐
   │                    BACKGROUND PROCESSING                         │
   │                                                                  │
   │  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐  │
   │  │ Extract  │───▶│ Chunk    │───▶│ Generate │───▶│ Store in │  │
   │  │ Text     │    │ Text     │    │ Embeddings│    │ Pinecone │  │
   │  │ (PDF,DOC)│    │ (800char)│    │ (BGE-M3) │    │ Vectors  │  │
   │  └──────────┘    └──────────┘    └──────────┘    └──────────┘  │
   │                                                                  │
   │  Status: pending ──▶ processing ──▶ completed                   │
   └─────────────────────────────────────────────────────────────────┘

3. DOCUMENT READY FOR QUERIES
   - Status changes to "completed"
   - Chunk count updated
   - Document searchable via chat
```

---

## Frontend Implementation Example

### React Chat Component

```typescript
// chat.service.ts

const API_BASE = '/api/chatbot';

interface Message {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  sources?: MessageSource[];
  createdAt: string;
}

interface MessageSource {
  documentId: number;
  documentName: string;
  relevance: number;
}

interface Session {
  id: number;
  title: string;
  createdAt: string;
  updatedAt: string;
}

interface ChatResponse {
  sessionId: number;
  sessionTitle: string;
  isNewSession: boolean;
  userMessage: Message;
  assistantMessage: Message;
}

// Get auth header
const getAuthHeader = (): Record<string, string> => {
  const token = localStorage.getItem('authToken');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

// Send message to chat
export const sendMessage = async (
  message: string,
  sessionId?: number
): Promise<ChatResponse> => {
  const response = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
    },
    body: JSON.stringify({ message, sessionId }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }

  const { data } = await response.json();
  return data;
};

// List user sessions
export const listSessions = async (
  page = 1,
  limit = 20
): Promise<{ sessions: Session[]; total: number }> => {
  const response = await fetch(
    `${API_BASE}/sessions?page=${page}&limit=${limit}`,
    { headers: getAuthHeader() }
  );

  if (!response.ok) {
    throw new Error('Failed to load sessions');
  }

  const result = await response.json();
  return { sessions: result.data, total: result.pagination.total };
};

// Get session with messages
export const getSession = async (
  sessionId: number,
  page = 1,
  limit = 50
): Promise<{ session: Session; messages: Message[]; total: number }> => {
  const response = await fetch(
    `${API_BASE}/sessions/${sessionId}?page=${page}&limit=${limit}`,
    { headers: getAuthHeader() }
  );

  if (!response.ok) {
    throw new Error('Session not found');
  }

  const { data } = await response.json();
  return {
    session: data.session,
    messages: data.messages,
    total: data.pagination.total,
  };
};

// Delete session
export const deleteSession = async (sessionId: number): Promise<void> => {
  const response = await fetch(`${API_BASE}/sessions/${sessionId}`, {
    method: 'DELETE',
    headers: getAuthHeader(),
  });

  if (!response.ok) {
    throw new Error('Failed to delete session');
  }
};
```

### React Chat UI Component

```tsx
// ChatUI.tsx

import { useState, useEffect, useRef } from 'react';
import { sendMessage, getSession, Message, MessageSource } from './chat.service';

interface ChatUIProps {
  sessionId?: number;
  onNewSession?: (sessionId: number) => void;
}

export function ChatUI({ sessionId: initialSessionId, onNewSession }: ChatUIProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(initialSessionId);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load existing session
  useEffect(() => {
    if (sessionId) {
      getSession(sessionId).then(({ messages }) => {
        setMessages(messages);
      });
    }
  }, [sessionId]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setLoading(true);

    // Optimistically add user message
    const tempUserMsg: Message = {
      id: Date.now(),
      role: 'user',
      content: userMessage,
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, tempUserMsg]);

    try {
      const response = await sendMessage(userMessage, sessionId);

      // Update session ID if new
      if (response.isNewSession) {
        setSessionId(response.sessionId);
        onNewSession?.(response.sessionId);
      }

      // Replace temp message with real one and add assistant response
      setMessages(prev => [
        ...prev.slice(0, -1),
        response.userMessage,
        response.assistantMessage,
      ]);
    } catch (error) {
      // Remove optimistic message on error
      setMessages(prev => prev.slice(0, -1));
      alert(error instanceof Error ? error.message : 'Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chat-container">
      <div className="messages">
        {messages.map(msg => (
          <div key={msg.id} className={`message ${msg.role}`}>
            <div className="content">{msg.content}</div>
            {msg.sources && msg.sources.length > 0 && (
              <div className="sources">
                <span>Sources:</span>
                {msg.sources.map((source, i) => (
                  <span key={i} className="source-badge">
                    📄 {source.documentName} ({Math.round(source.relevance * 100)}%)
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
        {loading && <div className="loading">NIRA is thinking...</div>}
        <div ref={messagesEndRef} />
      </div>

      <div className="input-area">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder="Ask NIRA anything..."
          disabled={loading}
        />
        <button onClick={handleSend} disabled={loading || !input.trim()}>
          Send
        </button>
      </div>
    </div>
  );
}
```

---

## Data Types

### Document Status

| Status | Description |
|--------|-------------|
| `pending` | Document uploaded, waiting to be processed |
| `processing` | Text extraction and embedding in progress |
| `completed` | Document fully processed and searchable |
| `failed` | Processing failed (check `errorMessage`) |

### Message Role

| Role | Description |
|------|-------------|
| `user` | Message from the user |
| `assistant` | Response from NIRA AI |

### Message Source

| Field | Type | Description |
|-------|------|-------------|
| `documentId` | number | ID of the source document |
| `documentName` | string | Name of the source document |
| `relevance` | number | Relevance score (0-1) |

---

## Configuration

### LLM Settings

| Setting | Value | Description |
|---------|-------|-------------|
| Provider | Groq | LLM API provider |
| Model | `llama-3.3-70b-versatile` | Default model |
| Max Tokens | 2048 | Maximum response length |
| Temperature | 0.7 | Response creativity |

### Document Processing

| Setting | Value | Description |
|---------|-------|-------------|
| Max File Size | 20 MB | Maximum upload size |
| Chunk Size | ~800 chars | Target chunk size |
| Overlap | 25% | Chunk overlap percentage |
| Embedding Model | BGE-M3 | Vector embedding model |

### Search Settings

| Setting | Value | Description |
|---------|-------|-------------|
| Top K | 5 | Number of chunks to retrieve |
| Min Similarity | 0.3 | Minimum relevance threshold |

---

## Error Response Format

All error responses follow this format:

```json
{
  "success": false,
  "message": "Error description",
  "errors": [
    {
      "field": "message",
      "message": "Message is required"
    }
  ]
}
```

---

## Related Endpoints

- **Auth Feature**: `/api/auth` - User authentication
- **User Feature**: `/api/users` - User profile management
