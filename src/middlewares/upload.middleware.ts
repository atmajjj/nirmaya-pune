import multer from 'multer';
import { Request, Response, NextFunction } from 'express';
import HttpException from '../utils/httpException';
import { config } from '../utils/validateEnv';

/**
 * File upload middleware using Multer
 * Note: Express.Request.file and files are defined in src/@types/express/index.d.ts
 */

// Configuration constants
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Allowed file types - configurable via environment variable
const ALLOWED_FILE_TYPES = config.ALLOWED_FILE_TYPES.split(',').map(type => type.trim());

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
 * Validates file presence and handles upload errors
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
      next();
    }
  });
};
