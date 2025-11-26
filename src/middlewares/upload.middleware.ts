import multer from 'multer';
import { Request, Response, NextFunction } from 'express';
import HttpException from '../utils/httpException';
import { config } from '../utils/validateEnv';

/**
 * File upload middleware using Multer
 * Includes MIME type validation and magic number (file signature) validation
 */

// Configuration constants
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Allowed file types - configurable via environment variable
const ALLOWED_FILE_TYPES = config.ALLOWED_FILE_TYPES.split(',').map(type => type.trim());

/**
 * Magic numbers (file signatures) for common file types
 * Used to validate actual file content, not just the MIME header
 */
const FILE_SIGNATURES: Record<string, number[][]> = {
  // Images
  'image/jpeg': [[0xff, 0xd8, 0xff]],
  'image/png': [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
  'image/gif': [[0x47, 0x49, 0x46, 0x38, 0x37, 0x61], [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]],
  'image/webp': [[0x52, 0x49, 0x46, 0x46]], // RIFF header (WebP starts with RIFF)
  'image/svg+xml': [[0x3c, 0x3f, 0x78, 0x6d, 0x6c], [0x3c, 0x73, 0x76, 0x67]], // <?xml or <svg
  
  // Documents
  'application/pdf': [[0x25, 0x50, 0x44, 0x46]], // %PDF
  
  // Archives
  'application/zip': [[0x50, 0x4b, 0x03, 0x04], [0x50, 0x4b, 0x05, 0x06]],
  
  // Office documents (OOXML - same as ZIP)
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': [[0x50, 0x4b, 0x03, 0x04]],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [[0x50, 0x4b, 0x03, 0x04]],
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': [[0x50, 0x4b, 0x03, 0x04]],
  
  // CSV/Text files don't have magic numbers - validated by MIME only
};

/**
 * Validate file content against known magic numbers
 * Returns true if file content matches expected signature for its MIME type
 */
function validateFileSignature(buffer: Buffer, mimeType: string): boolean {
  const signatures = FILE_SIGNATURES[mimeType];
  
  // If no signature defined for this type, allow based on MIME check only
  // (e.g., CSV, plain text files)
  if (!signatures) {
    return true;
  }
  
  // Check if buffer starts with any of the valid signatures
  return signatures.some(signature => {
    if (buffer.length < signature.length) {
      return false;
    }
    return signature.every((byte, index) => buffer[index] === byte);
  });
}

// Configure storage
const storage = multer.memoryStorage(); // Store files in memory, not on disk

// File filter function to validate mime types
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (ALLOWED_FILE_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `File type ${file.mimetype} is not allowed. Allowed types: ${ALLOWED_FILE_TYPES.join(', ')}`
      )
    );
  }
};

// Configure multer
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
});

/**
 * Common error handling function for multer errors
 */
const handleMulterError = (err: Error | multer.MulterError, next: NextFunction) => {
  if (err instanceof multer.MulterError) {
    // A Multer error occurred when uploading
    if (err.code === 'LIMIT_FILE_SIZE') {
      next(
        new HttpException(
          400,
          `File size exceeds maximum allowed size of ${MAX_FILE_SIZE / (1024 * 1024)}MB`
        )
      );
    } else {
      next(new HttpException(400, err.message));
    }
  } else {
    // An unknown error occurred
    next(new HttpException(400, err.message));
  }
};

/**
 * Middleware for single file upload
 * Validates file presence, MIME type, and file signature (magic number)
 */
export const uploadSingleFileMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const multerSingle = upload.single('file');

  multerSingle(req, res, (err: unknown) => {
    if (err) {
      handleMulterError(err as Error, next);
    } else {
      // Check if file exists
      if (!req.file) {
        return next(new HttpException(400, 'No file uploaded'));
      }

      // Validate file signature (magic number) for content-based validation
      const isValidSignature = validateFileSignature(req.file.buffer, req.file.mimetype);
      if (!isValidSignature) {
        return next(
          new HttpException(
            400,
            `File content does not match declared type ${req.file.mimetype}. Possible file spoofing detected.`
          )
        );
      }

      next();
    }
  });
};
