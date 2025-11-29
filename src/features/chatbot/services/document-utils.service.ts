/**
 * Document Processor Utilities
 *
 * Pure validation functions for document processing.
 * These are separated for easier testing without ESM module issues.
 */

import { chatbotConfig } from '../config/chatbot.config';

/**
 * Allowed MIME types for document upload
 */
export const ALLOWED_MIME_TYPES = chatbotConfig.general.allowedMimeTypes;

/**
 * Max file size in bytes (20MB)
 */
export const MAX_FILE_SIZE = chatbotConfig.general.maxFileSize;

/**
 * Check if file type is valid for document processing
 * @param mimeType - MIME type to validate
 * @returns true if valid
 */
export function isValidFileType(mimeType: string): boolean {
  return ALLOWED_MIME_TYPES.includes(mimeType);
}

/**
 * Check if file size is within limits
 * @param sizeInBytes - File size in bytes
 * @returns true if valid
 */
export function isValidFileSize(sizeInBytes: number): boolean {
  return sizeInBytes >= 0 && sizeInBytes <= MAX_FILE_SIZE;
}

/**
 * Get file extension from MIME type
 * @param mimeType - MIME type
 * @returns File extension with dot (e.g., '.pdf')
 */
export function getExtensionFromMimeType(mimeType: string): string {
  const mimeToExtension: Record<string, string> = {
    'application/pdf': '.pdf',
    'text/plain': '.txt',
    'text/markdown': '.md',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  };

  return mimeToExtension[mimeType] || '.bin';
}

/**
 * Validate document for upload
 * @param mimeType - MIME type
 * @param sizeInBytes - File size
 * @throws Error if validation fails
 */
export function validateDocument(mimeType: string, sizeInBytes: number): void {
  if (!isValidFileType(mimeType)) {
    throw new Error(
      `Unsupported file type: ${mimeType}. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`
    );
  }

  if (!isValidFileSize(sizeInBytes)) {
    throw new Error(
      `File size ${sizeInBytes} exceeds maximum allowed size of ${MAX_FILE_SIZE} bytes (20MB)`
    );
  }
}
