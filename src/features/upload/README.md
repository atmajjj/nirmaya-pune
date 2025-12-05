# Upload Feature - Frontend Integration Guide

## Overview

The Upload feature provides file management capabilities for users. Files are stored in AWS S3 with metadata tracked in the database. Users can upload, list, download, update, and delete their files. Each upload tracks processing status and supports soft deletion.

## Base URL

```
/api/uploads
```

## Authentication Requirements

| Endpoint | Authentication | Authorization |
|----------|----------------|---------------|
| `POST /` | ✅ Required | Owner only |
| `GET /` | ✅ Required | Owner only |
| `GET /stats` | ✅ Required | Owner only |
| `GET /:id` | ✅ Required | Owner only |
| `GET /:id/download` | ✅ Required | Owner only |
| `PUT /:id` | ✅ Required | Owner only |
| `DELETE /:id` | ✅ Required | Owner only |

> **Note:** All upload endpoints are user-scoped. Users can only access their own uploads.

---

## Endpoints

### 1. Upload File

Upload a file to S3 and create a database record.

**Endpoint:** `POST /api/uploads`

**Authentication:** Required (Bearer Token)

#### Request Headers

```http
Authorization: Bearer <jwt_token>
Content-Type: multipart/form-data
```

#### Request Body (Form Data)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | File | ✅ | File to upload |

#### Supported File Types

All common file types are supported including:
- Documents: PDF, DOC, DOCX, TXT, CSV, XLS, XLSX
- Images: JPG, PNG, GIF, SVG, WebP
- Data: JSON, XML, CSV

#### Success Response

**Status Code:** `201 Created`

```json
{
  "success": true,
  "message": "File uploaded successfully",
  "data": {
    "id": 42,
    "user_id": 5,
    "filename": "water_quality_data.csv",
    "original_filename": "water_quality_data.csv",
    "mime_type": "text/csv",
    "file_size": 125678,
    "file_path": "uploads/5/2024/01/15/water_quality_data_abc123.csv",
    "file_url": "https://bucket.s3.amazonaws.com/uploads/5/2024/01/15/water_quality_data_abc123.csv",
    "status": "pending",
    "error_message": null,
    "created_by": 5,
    "created_at": "2024-01-15T10:30:00.000Z",
    "updated_at": "2024-01-15T10:30:00.000Z",
    "is_deleted": false
  }
}
```

#### Error Responses

| Status | Error | Description |
|--------|-------|-------------|
| `400` | Bad Request | No file uploaded |
| `401` | Unauthorized | Missing or invalid JWT token |
| `413` | Payload Too Large | File exceeds size limit |

---

### 2. List Uploads

Get paginated list of user's uploads with filtering and sorting.

**Endpoint:** `GET /api/uploads`

**Authentication:** Required (Bearer Token)

#### Request Headers

```http
Authorization: Bearer <jwt_token>
```

#### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | number | `1` | Page number |
| `limit` | number | `10` | Items per page |
| `status` | string | - | Filter by status: `pending`, `processing`, `completed`, `failed` |
| `mime_type` | string | - | Filter by MIME type (e.g., `text/csv`) |
| `sort_by` | string | `created_at` | Sort field: `created_at`, `file_size`, `original_filename` |
| `sort_order` | string | `desc` | Sort order: `asc`, `desc` |

#### Example Request

```
GET /api/uploads?status=completed&sort_by=file_size&sort_order=desc&page=1&limit=20
```

#### Success Response

**Status Code:** `200 OK`

```json
{
  "success": true,
  "message": "Uploads retrieved successfully",
  "data": [
    {
      "id": 42,
      "user_id": 5,
      "filename": "water_quality_data.csv",
      "original_filename": "water_quality_data.csv",
      "mime_type": "text/csv",
      "file_size": 125678,
      "file_path": "uploads/5/2024/01/15/water_quality_data_abc123.csv",
      "file_url": "https://bucket.s3.amazonaws.com/uploads/5/...",
      "status": "completed",
      "error_message": null,
      "created_by": 5,
      "created_at": "2024-01-15T10:30:00.000Z",
      "updated_at": "2024-01-15T10:32:00.000Z",
      "is_deleted": false
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 15
  }
}
```

---

### 3. Get Upload by ID

Get a specific upload's details.

**Endpoint:** `GET /api/uploads/:id`

**Authentication:** Required (Bearer Token)

#### Request Headers

```http
Authorization: Bearer <jwt_token>
```

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | number | Upload ID |

#### Success Response

**Status Code:** `200 OK`

```json
{
  "success": true,
  "message": "Upload retrieved successfully",
  "data": {
    "id": 42,
    "user_id": 5,
    "filename": "water_quality_data.csv",
    "original_filename": "water_quality_data.csv",
    "mime_type": "text/csv",
    "file_size": 125678,
    "file_path": "uploads/5/2024/01/15/water_quality_data_abc123.csv",
    "file_url": "https://bucket.s3.amazonaws.com/uploads/5/...",
    "status": "completed",
    "error_message": null,
    "created_by": 5,
    "created_at": "2024-01-15T10:30:00.000Z",
    "updated_at": "2024-01-15T10:32:00.000Z",
    "is_deleted": false
  }
}
```

#### Error Responses

| Status | Error | Description |
|--------|-------|-------------|
| `401` | Unauthorized | Missing or invalid JWT token |
| `404` | Not Found | Upload not found or belongs to another user |

---

### 4. Download File

Download the actual file from S3.

**Endpoint:** `GET /api/uploads/:id/download`

**Authentication:** Required (Bearer Token)

#### Request Headers

```http
Authorization: Bearer <jwt_token>
```

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | number | Upload ID |

#### Success Response

**Status Code:** `200 OK`

**Content-Type:** (varies based on file type)

**Content-Disposition:** `attachment; filename="original_filename.csv"`

The response body contains the raw file data.

#### Error Responses

| Status | Error | Description |
|--------|-------|-------------|
| `401` | Unauthorized | Missing or invalid JWT token |
| `404` | Not Found | Upload not found or belongs to another user |

---

### 5. Update Upload

Update upload metadata (filename or status).

**Endpoint:** `PUT /api/uploads/:id`

**Authentication:** Required (Bearer Token)

#### Request Headers

```http
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | number | Upload ID |

#### Request Body

```json
{
  "filename": "renamed_file.csv",
  "status": "completed",
  "error_message": null
}
```

#### Request Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `filename` | string | ❌ | New filename (min 1 char) |
| `status` | string | ❌ | Status: `pending`, `processing`, `completed`, `failed` |
| `error_message` | string | ❌ | Error message (for failed status) |

#### Success Response

**Status Code:** `200 OK`

```json
{
  "success": true,
  "message": "Upload updated successfully",
  "data": {
    "id": 42,
    "user_id": 5,
    "filename": "renamed_file.csv",
    "original_filename": "water_quality_data.csv",
    "mime_type": "text/csv",
    "file_size": 125678,
    "file_path": "uploads/5/2024/01/15/water_quality_data_abc123.csv",
    "file_url": "https://bucket.s3.amazonaws.com/uploads/5/...",
    "status": "completed",
    "error_message": null,
    "created_by": 5,
    "created_at": "2024-01-15T10:30:00.000Z",
    "updated_at": "2024-01-15T11:00:00.000Z",
    "is_deleted": false
  }
}
```

#### Error Responses

| Status | Error | Description |
|--------|-------|-------------|
| `400` | Validation Error | Invalid request body |
| `401` | Unauthorized | Missing or invalid JWT token |
| `404` | Not Found | Upload not found or belongs to another user |

---

### 6. Delete Upload

Soft delete an upload. The file remains in S3 but is marked as deleted.

**Endpoint:** `DELETE /api/uploads/:id`

**Authentication:** Required (Bearer Token)

#### Request Headers

```http
Authorization: Bearer <jwt_token>
```

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | number | Upload ID |

#### Success Response

**Status Code:** `200 OK`

```json
{
  "success": true,
  "message": "Upload deleted successfully",
  "data": null
}
```

#### Error Responses

| Status | Error | Description |
|--------|-------|-------------|
| `401` | Unauthorized | Missing or invalid JWT token |
| `404` | Not Found | Upload not found or belongs to another user |

---

### 7. Get Upload Statistics

Get aggregate statistics about user's uploads.

**Endpoint:** `GET /api/uploads/stats`

**Authentication:** Required (Bearer Token)

#### Request Headers

```http
Authorization: Bearer <jwt_token>
```

#### Success Response

**Status Code:** `200 OK`

```json
{
  "success": true,
  "message": "Upload statistics retrieved successfully",
  "data": {
    "total_uploads": 45,
    "total_size": 156789012,
    "uploads_by_status": {
      "pending": 2,
      "processing": 1,
      "completed": 40,
      "failed": 2
    },
    "uploads_by_type": {
      "text/csv": 25,
      "application/pdf": 12,
      "image/png": 5,
      "application/json": 3
    }
  }
}
```

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `total_uploads` | number | Total number of uploads |
| `total_size` | number | Total size in bytes |
| `uploads_by_status` | object | Count by status |
| `uploads_by_type` | object | Count by MIME type |

---

## Upload Status Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                       UPLOAD STATUS FLOW                             │
└─────────────────────────────────────────────────────────────────────┘

   Upload Created          Processing Started         Processing Done
        │                        │                          │
        ▼                        ▼                          ▼
   ┌─────────┐              ┌──────────┐              ┌───────────┐
   │ PENDING │ ──────────▶  │PROCESSING│ ──────────▶ │ COMPLETED │
   └─────────┘              └──────────┘              └───────────┘
        │                        │
        │                        │  Error Occurred
        │                        │
        │                        ▼
        │                   ┌────────┐
        └─────────────────▶ │ FAILED │
                            └────────┘
```

### Status Descriptions

| Status | Description |
|--------|-------------|
| `pending` | File uploaded, waiting for processing |
| `processing` | File is being processed (e.g., by HMPI Engine) |
| `completed` | Processing completed successfully |
| `failed` | Processing failed (check `error_message`) |

---

## Frontend Implementation Example

### TypeScript Service

```typescript
// upload.service.ts

const API_BASE = '/api/uploads';

interface Upload {
  id: number;
  user_id: number;
  filename: string;
  original_filename: string;
  mime_type: string;
  file_size: number;
  file_path: string;
  file_url: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

interface UploadStats {
  total_uploads: number;
  total_size: number;
  uploads_by_status: {
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  };
  uploads_by_type: Record<string, number>;
}

interface ListParams {
  page?: number;
  limit?: number;
  status?: 'pending' | 'processing' | 'completed' | 'failed';
  mime_type?: string;
  sort_by?: 'created_at' | 'file_size' | 'original_filename';
  sort_order?: 'asc' | 'desc';
}

// Get auth header
const getAuthHeader = (): Record<string, string> => {
  const token = localStorage.getItem('authToken');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

// Upload a file
export const uploadFile = async (file: File): Promise<Upload> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(API_BASE, {
    method: 'POST',
    headers: getAuthHeader(),
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }

  const { data } = await response.json();
  return data;
};

// List uploads with filters
export const listUploads = async (
  params: ListParams = {}
): Promise<{ uploads: Upload[]; total: number }> => {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) searchParams.set(key, String(value));
  });

  const response = await fetch(`${API_BASE}?${searchParams}`, {
    headers: getAuthHeader(),
  });

  if (!response.ok) {
    throw new Error('Failed to fetch uploads');
  }

  const result = await response.json();
  return { uploads: result.data, total: result.pagination.total };
};

// Get single upload
export const getUpload = async (id: number): Promise<Upload> => {
  const response = await fetch(`${API_BASE}/${id}`, {
    headers: getAuthHeader(),
  });

  if (!response.ok) {
    throw new Error('Upload not found');
  }

  const { data } = await response.json();
  return data;
};

// Download file
export const downloadFile = async (id: number, filename: string): Promise<void> => {
  const response = await fetch(`${API_BASE}/${id}/download`, {
    headers: getAuthHeader(),
  });

  if (!response.ok) {
    throw new Error('Failed to download file');
  }

  // Create blob and download
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
};

// Update upload
export const updateUpload = async (
  id: number,
  data: { filename?: string; status?: string; error_message?: string }
): Promise<Upload> => {
  const response = await fetch(`${API_BASE}/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }

  const { data: upload } = await response.json();
  return upload;
};

// Delete upload
export const deleteUpload = async (id: number): Promise<void> => {
  const response = await fetch(`${API_BASE}/${id}`, {
    method: 'DELETE',
    headers: getAuthHeader(),
  });

  if (!response.ok) {
    throw new Error('Failed to delete upload');
  }
};

// Get upload stats
export const getUploadStats = async (): Promise<UploadStats> => {
  const response = await fetch(`${API_BASE}/stats`, {
    headers: getAuthHeader(),
  });

  if (!response.ok) {
    throw new Error('Failed to fetch statistics');
  }

  const { data } = await response.json();
  return data;
};

// Format file size for display
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};
```

### React File Upload Component

```tsx
// FileUploader.tsx

import { useState, useRef } from 'react';
import { uploadFile, Upload, formatFileSize } from './upload.service';

interface FileUploaderProps {
  onUploadComplete?: (upload: Upload) => void;
  accept?: string;
}

export function FileUploader({ onUploadComplete, accept }: FileUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    setProgress(0);

    try {
      const upload = await uploadFile(file);
      onUploadComplete?.(upload);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="file-uploader">
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileSelect}
        disabled={uploading}
      />
      
      {uploading && (
        <div className="upload-progress">
          <div className="progress-bar" style={{ width: `${progress}%` }} />
          <span>Uploading...</span>
        </div>
      )}
      
      {error && <p className="error">{error}</p>}
    </div>
  );
}
```

### React Upload List Component

```tsx
// UploadList.tsx

import { useState, useEffect } from 'react';
import { listUploads, deleteUpload, downloadFile, Upload, formatFileSize } from './upload.service';

export function UploadList() {
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const limit = 10;

  useEffect(() => {
    loadUploads();
  }, [page]);

  const loadUploads = async () => {
    setLoading(true);
    try {
      const result = await listUploads({ page, limit, sort_by: 'created_at', sort_order: 'desc' });
      setUploads(result.uploads);
      setTotal(result.total);
    } catch (err) {
      console.error('Failed to load uploads:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (upload: Upload) => {
    try {
      await downloadFile(upload.id, upload.original_filename);
    } catch (err) {
      alert('Download failed');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this file?')) return;
    
    try {
      await deleteUpload(id);
      setUploads(uploads.filter(u => u.id !== id));
    } catch (err) {
      alert('Delete failed');
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'yellow',
      processing: 'blue',
      completed: 'green',
      failed: 'red',
    };
    return <span className={`badge badge-${colors[status]}`}>{status}</span>;
  };

  if (loading) return <p>Loading...</p>;

  return (
    <div className="upload-list">
      <table>
        <thead>
          <tr>
            <th>Filename</th>
            <th>Size</th>
            <th>Type</th>
            <th>Status</th>
            <th>Uploaded</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {uploads.map(upload => (
            <tr key={upload.id}>
              <td>{upload.original_filename}</td>
              <td>{formatFileSize(upload.file_size)}</td>
              <td>{upload.mime_type}</td>
              <td>{getStatusBadge(upload.status)}</td>
              <td>{new Date(upload.created_at).toLocaleDateString()}</td>
              <td>
                <button onClick={() => handleDownload(upload)}>Download</button>
                <button onClick={() => handleDelete(upload.id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="pagination">
        <button 
          disabled={page === 1} 
          onClick={() => setPage(p => p - 1)}
        >
          Previous
        </button>
        <span>Page {page} of {Math.ceil(total / limit)}</span>
        <button 
          disabled={page >= Math.ceil(total / limit)} 
          onClick={() => setPage(p => p + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}
```

---

## Data Types

### Upload Status

| Status | Description |
|--------|-------------|
| `pending` | File uploaded, waiting for processing |
| `processing` | File is being processed |
| `completed` | Processing completed successfully |
| `failed` | Processing failed |

### Common MIME Types

| Type | MIME Type |
|------|-----------|
| CSV | `text/csv` |
| PDF | `application/pdf` |
| JSON | `application/json` |
| PNG | `image/png` |
| JPEG | `image/jpeg` |
| Word | `application/vnd.openxmlformats-officedocument.wordprocessingml.document` |
| Excel | `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` |

---

## Error Response Format

All error responses follow this format:

```json
{
  "success": false,
  "message": "Error description",
  "errors": [
    {
      "field": "file",
      "message": "No file uploaded"
    }
  ]
}
```

---

## Related Endpoints

- **HMPI Engine**: `/api/hmpi-engine` - Uses uploads for CSV processing
- **Chatbot**: `/api/chatbot/documents` - Uses uploads for document training
