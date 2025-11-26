import { UploadStatus, uploads } from './schema';

// Upload entity interfaces
export interface Upload {
  id: number;
  user_id: number;
  filename: string;
  original_filename: string;
  mime_type: string;
  file_size: number;
  file_path: string;
  file_url: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error_message?: string;
  created_by: number;
  created_at: string;
  updated_by?: number;
  updated_at: string;
  is_deleted: boolean;
  deleted_by?: number;
  deleted_at?: string;
}

// Input interface for updating an upload
export interface UploadUpdateInput {
  filename?: string;
  status?: UploadStatus;
  error_message?: string;
  updated_by?: number;
}

// Upload statistics interface
export interface UploadStats {
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

/**
 * Convert Drizzle upload record to API response format
 * Centralizes date-to-ISO conversion
 */
export function convertUpload(upload: typeof uploads.$inferSelect): Upload {
  return {
    ...upload,
    created_at: upload.created_at.toISOString(),
    updated_at: upload.updated_at.toISOString(),
    deleted_at: upload.deleted_at?.toISOString(),
  } as Upload;
}
