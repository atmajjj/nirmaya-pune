import multer from "multer";
import { Request, Response, NextFunction } from "express";
import HttpException from "../exceptions/HttpException";

// Extend Express Request type to include file and files properties
declare global {
  namespace Express {
    interface Request {
      file?: Multer.File;
      files?: Multer.File[];
    }
    namespace Multer {
      interface File {
        fieldname: string;
        originalname: string;
        encoding: string;
        mimetype: string;
        size: number;
        destination?: string;
        filename?: string;
        path?: string;
        buffer: Buffer;
      }
    }
  }
}

// Configure storage
const storage = multer.memoryStorage(); // Store files in memory, not on disk

// Define allowed file types
const ALLOWED_FILE_TYPES = [
  "application/pdf",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

// Define file size limits
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// File filter function to validate mime types
const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  if (ALLOWED_FILE_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `File type ${
          file.mimetype
        } is not allowed. Allowed types: ${ALLOWED_FILE_TYPES.join(", ")}`
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

// Middleware for single file upload
export const uploadSingleFileMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const multerSingle = upload.single("file");

  multerSingle(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        // A Multer error occurred when uploading
        if (err.code === "LIMIT_FILE_SIZE") {
          next(
            new HttpException(
              400,
              `File size exceeds maximum allowed size of ${
                MAX_FILE_SIZE / (1024 * 1024)
              }MB`
            )
          );
        } else {
          next(new HttpException(400, err.message));
        }
      } else {
        // An unknown error occurred
        next(new HttpException(400, err.message));
      }
    } else {
      // Check if file exists
      if (!req.file) {
        return next(new HttpException(400, "No file uploaded"));
      }
      next();
    }
  });
};

// Middleware for multiple files upload
export const uploadMultipleFilesMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const multerArray = upload.array("files", 10); // Max 10 files

  multerArray(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        // A Multer error occurred when uploading
        if (err.code === "LIMIT_FILE_SIZE") {
          next(
            new HttpException(
              400,
              `File size exceeds maximum allowed size of ${
                MAX_FILE_SIZE / (1024 * 1024)
              }MB`
            )
          );
        } else {
          next(new HttpException(400, err.message));
        }
      } else {
        // An unknown error occurred
        next(new HttpException(400, err.message));
      }
    } else {
      // Check if files exist
      if (!req.files || req.files.length === 0) {
        return next(new HttpException(400, "No files uploaded"));
      }
      next();
    }
  });
};
