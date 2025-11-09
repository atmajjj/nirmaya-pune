import { z } from 'zod';

// Upload status enum
export const uploadStatusSchema = z.enum(['pending', 'processing', 'completed', 'failed']);

// Supported MIME types
export const supportedMimeTypes = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'text/plain',
  'text/csv',
  'application/json',
  'application/xml',
  'text/xml',
] as const;

export const mimeTypeSchema = z.enum(supportedMimeTypes);

// Create upload schema
export const createUploadSchema = z.object({
  filename: z.string().min(1, 'Filename is required'),
  original_filename: z.string().min(1, 'Original filename is required'),
  mime_type: mimeTypeSchema,
  file_size: z.number().min(1, 'File size must be greater than 0'),
  file_path: z.string().min(1, 'File path is required'),
  file_url: z.string().url('Invalid file URL'),
});

// Update upload schema
export const updateUploadSchema = z.object({
  filename: z.string().min(1, 'Filename is required').optional(),
  status: uploadStatusSchema.optional(),
  error_message: z.string().optional(),
});

// Upload query parameters schema
export const uploadQuerySchema = z.object({
  status: uploadStatusSchema.optional(),
  mime_type: mimeTypeSchema.optional(),
  page: z.string().regex(/^\d+$/).transform(Number).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
  sort_by: z.enum(['created_at', 'file_size', 'filename']).optional(),
  sort_order: z.enum(['asc', 'desc']).optional(),
});

// File upload schema for multipart/form-data
export const fileUploadSchema = z.object({
  file: z.any(), // This will be validated by multer middleware
});

// Type exports
export type CreateUpload = z.infer<typeof createUploadSchema>;
export type UpdateUpload = z.infer<typeof updateUploadSchema>;
export type UploadQuery = z.infer<typeof uploadQuerySchema>;
