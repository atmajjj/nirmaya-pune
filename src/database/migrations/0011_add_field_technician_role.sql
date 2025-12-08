-- Migration: Add field_technician role
-- Date: 2025-12-09
-- Description: Add field_technician role to support field technicians who upload data sources

-- Note: PostgreSQL will automatically accept the new role value in the TEXT column
-- No schema change needed, just documenting the addition of 'field_technician' to valid roles
-- Valid roles are now: 'admin', 'scientist', 'researcher', 'policymaker', 'field_technician'

-- This is a documentation-only migration
-- The application code enforces the valid role values via TypeScript types and Zod validation
