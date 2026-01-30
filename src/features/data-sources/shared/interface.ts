import { DataSource, DataSourceStatus, FileType } from './schema';

/**
 * Data source with uploader details
 */
export interface DataSourceWithUploader extends DataSource {
  uploader?: {
    id: number;
    full_name: string;
    email: string;
  };
}

/**
 * Upload data source request body
 */
export interface UploadDataSourceRequest {
  description?: string;
}

/**
 * Update data source request body
 */
export interface UpdateDataSourceRequest {
  description?: string;
  status?: DataSourceStatus;
}

/**
 * List data sources query parameters
 */
export interface ListDataSourcesQuery {
  page?: number;
  limit?: number;
  status?: DataSourceStatus;
  file_type?: FileType;
  uploaded_by?: number;
  search?: string;
  sort_by?: 'created_at' | 'filename' | 'file_size';
  sort_order?: 'asc' | 'desc';
}

/**
 * Data source API response
 */
export interface DataSourceResponse {
  id: number;
  filename: string;
  original_filename: string;
  file_type: FileType;
  mime_type: string;
  file_size: number;
  file_url: string;
  status: DataSourceStatus;
  error_message?: string | null;
  metadata?: {
    total_rows?: number;
    column_count?: number;
    columns?: string[];
    stations?: string[];
    date_range?: { from?: string; to?: string };
    preview_rows?: number;
  } | null;
  description?: string | null;
  uploaded_by: number;
  uploader?: {
    id: number;
    full_name: string;
    email: string;
  };
  calculation_status?: 'not_started' | 'calculating' | 'completed' | 'failed';
  calculation_upload_id?: number | null;
  calculation_error?: string | null;
  calculation_completed_at?: Date | null;
  calculated_indices?: {
    wqi?: boolean;
    hpi?: boolean;
    mi?: boolean;
  } | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * Paginated data sources response
 */
export interface PaginatedDataSourcesResponse {
  data: DataSourceResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

/**
 * File validation result
 */
export interface FileValidationResult {
  isValid: boolean;
  error?: string;
  metadata?: {
    total_rows: number;
    column_count: number;
    columns: string[];
    stations?: string[];
    date_range?: { from?: string; to?: string };
  };
}
