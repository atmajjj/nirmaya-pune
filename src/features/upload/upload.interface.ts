import { UploadStatus } from './upload.schema';

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

// Input interface for creating an upload
export interface UploadInput {
  user_id: number;
  filename: string;
  original_filename: string;
  mime_type: string;
  file_size: number;
  file_path: string;
  file_url: string;
  created_by: number;
}

// Input interface for updating an upload
export interface UploadUpdateInput {
  filename?: string;
  status?: UploadStatus;
  error_message?: string;
  updated_by?: number;
}

// Raw upload statistics from database query
export interface UploadStatsRaw {
  total_uploads: string | number;
  total_size: string | number;
  pending_count: string | number;
  processing_count: string | number;
  completed_count: string | number;
  failed_count: string | number;
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
