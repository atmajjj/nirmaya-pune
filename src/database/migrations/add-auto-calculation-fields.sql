-- Migration: Add auto-calculation fields to data_sources table
-- Date: 2026-01-30
-- Description: Enable automatic calculation tracking for uploaded data sources

ALTER TABLE data_sources 
ADD COLUMN IF NOT EXISTS calculation_status VARCHAR(20) DEFAULT 'not_started',
ADD COLUMN IF NOT EXISTS calculation_upload_id INTEGER REFERENCES uploads(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS calculation_error TEXT,
ADD COLUMN IF NOT EXISTS calculation_completed_at TIMESTAMP;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_data_sources_calculation_status 
ON data_sources(calculation_status) WHERE calculation_status != 'not_started';

-- Add comment for documentation
COMMENT ON COLUMN data_sources.calculation_status IS 'Status of automatic calculation: not_started, calculating, completed, failed';
COMMENT ON COLUMN data_sources.calculation_upload_id IS 'References uploads table - stores the calculation result';
COMMENT ON COLUMN data_sources.calculation_error IS 'Error message if calculation failed';
COMMENT ON COLUMN data_sources.calculation_completed_at IS 'Timestamp when calculation completed successfully';
