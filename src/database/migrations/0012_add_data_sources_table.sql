-- Migration: Add data_sources table
-- Created: 2024-01-XX
-- Description: Create data_sources table for field technician CSV/Excel uploads

CREATE TABLE IF NOT EXISTS data_sources (
  id SERIAL PRIMARY KEY,
  
  -- File information
  filename VARCHAR(255) NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  file_type TEXT NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  file_size BIGINT NOT NULL,
  file_path TEXT NOT NULL,
  file_url TEXT NOT NULL,
  
  -- Uploader information
  uploaded_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Status tracking
  status TEXT DEFAULT 'pending' NOT NULL,
  error_message TEXT,
  
  -- Metadata (extracted from file)
  metadata JSONB,
  
  -- Description/notes from field technician
  description TEXT,
  
  -- Audit fields
  created_by INTEGER,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_by INTEGER,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
  is_deleted BOOLEAN DEFAULT FALSE NOT NULL,
  deleted_by INTEGER,
  deleted_at TIMESTAMP
);

-- Create indexes
CREATE INDEX data_sources_uploaded_by_is_deleted_idx ON data_sources(uploaded_by, is_deleted);
CREATE INDEX data_sources_status_is_deleted_idx ON data_sources(status, is_deleted);
CREATE INDEX data_sources_file_type_idx ON data_sources(file_type);
CREATE INDEX data_sources_created_at_idx ON data_sources(created_at);

-- Add constraints for status enum
ALTER TABLE data_sources ADD CONSTRAINT data_sources_status_check 
  CHECK (status IN ('pending', 'available', 'processing', 'archived', 'failed'));

-- Add constraints for file_type enum
ALTER TABLE data_sources ADD CONSTRAINT data_sources_file_type_check 
  CHECK (file_type IN ('csv', 'xlsx', 'xls'));
