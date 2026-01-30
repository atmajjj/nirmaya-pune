import { Router, Response } from 'express';
import multer from 'multer';
import { requireAuth } from '../../../middlewares/auth.middleware';
import { requireRole } from '../../../middlewares/role.middleware';
import { asyncHandler } from '../../../utils/controllerHelpers';
import { ResponseFormatter } from '../../../utils/responseFormatter';
import HttpException from '../../../utils/httpException';
import { uploadToS3 } from '../../../utils/s3Upload';
import { createDataSource } from '../shared/queries';
import { DataSourceResponse } from '../shared/interface';
import { processDataSourceFile } from '../services/processor.service';
import { logger } from '../../../utils/logger';
import path from 'path';

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB for CSV/Excel files
  },
  fileFilter: (req, file, cb) => {
    // Allow CSV and Excel files based on MIME type OR file extension
    const allowedMimeTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/octet-stream', // Generic binary - check extension
      'text/plain', // Sometimes CSV files come as text/plain
    ];
    
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExtensions = ['.csv', '.xls', '.xlsx'];
    
    // Accept if MIME type matches OR file extension is valid
    if (allowedMimeTypes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new HttpException(400, `Invalid file type. Only CSV, XLS, and XLSX files are allowed. Received: ${file.mimetype} with extension ${ext}`) as any, false);
    }
  },
});

/**
 * Multer error handler middleware
 */
const handleMulterError = (err: any, req: any, res: Response, next: any): void => {
  if (err) {
    logger.error('Multer error:', {
      message: err.message,
      code: err.code,
      field: err.field
    });
    
    if (err.message && err.message.includes('Boundary not found')) {
      res.status(400).json({
        success: false,
        message: 'Invalid request format. Please ensure you are sending a multipart/form-data request with Content-Type header and file in "file" field.',
        error: 'INVALID_MULTIPART_REQUEST'
      });
      return;
    }
    
    if (err.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json({
        success: false,
        message: 'File size exceeds 50MB limit',
        error: 'FILE_TOO_LARGE'
      });
      return;
    }
    
    res.status(500).json({
      success: false,
      message: err.message || 'File upload error',
      error: err.code || 'UPLOAD_ERROR'
    });
    return;
  }
  next();
};

/**
 * Business logic: Upload CSV/Excel file
 */
async function uploadFile(
  file: Express.Multer.File,
  userId: number,
  description?: string
): Promise<DataSourceResponse> {
  // Validate file extension
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedExtensions = ['.csv', '.xls', '.xlsx'];
  
  if (!allowedExtensions.includes(ext)) {
    throw new HttpException(400, 'Invalid file extension. Only .csv, .xls, and .xlsx files are allowed.');
  }

  // Determine file type
  let fileType: 'csv' | 'xlsx' | 'xls';
  if (ext === '.csv') {
    fileType = 'csv';
  } else if (ext === '.xlsx') {
    fileType = 'xlsx';
  } else {
    fileType = 'xls';
  }

  // Generate unique filename
  const timestamp = Date.now();
  const sanitizedFilename = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
  const filename = `data-sources/${userId}/${timestamp}-${sanitizedFilename}`;

  // Upload to S3
  const s3Result = await uploadToS3(file.buffer, filename, file.mimetype, userId);

  // Create database record
  const dataSource = await createDataSource({
    filename: sanitizedFilename,
    original_filename: file.originalname,
    file_type: fileType,
    mime_type: file.mimetype,
    file_size: file.size,
    file_path: s3Result.key,
    file_url: s3Result.url,
    uploaded_by: userId,
    status: 'pending',
    description: description || null,
    created_by: userId,
  });

  // Process file asynchronously (parse and extract metadata)
  // Don't await - let it run in background
  // Wrap in setImmediate to ensure it runs after response is sent
  setImmediate(() => {
    processDataSourceFile(dataSource.id).catch(error => {
      logger.error(`Background processing failed for data source ${dataSource.id}:`, error);
    });
  });

  // Format response
  return {
    id: dataSource.id,
    filename: dataSource.filename,
    original_filename: dataSource.original_filename,
    file_type: dataSource.file_type as 'csv' | 'xlsx' | 'xls',
    mime_type: dataSource.mime_type,
    file_size: dataSource.file_size,
    file_url: dataSource.file_url,
    status: dataSource.status as 'pending' | 'available' | 'processing' | 'archived' | 'failed',
    error_message: dataSource.error_message,
    metadata: dataSource.metadata,
    description: dataSource.description,
    uploaded_by: dataSource.uploaded_by,
    created_at: dataSource.created_at,
    updated_at: dataSource.updated_at,
  };
}

/**
 * Handler: Upload data source file
 */
const handler = asyncHandler(async (req: any, res: Response) => {
  logger.info('Upload handler called', {
    hasFile: !!req.file,
    contentType: req.headers['content-type'],
    userId: req.userId,
    bodyKeys: Object.keys(req.body || {})
  });

  if (!req.file) {
    logger.error('No file in request', {
      headers: req.headers,
      body: req.body
    });
    throw new HttpException(400, 'No file uploaded. Please ensure you are sending a multipart/form-data request with a file field named "file".');
  }

  const { description } = req.body;
  const userId = req.userId!;

  logger.info('Processing upload', {
    filename: req.file.originalname,
    size: req.file.size,
    mimetype: req.file.mimetype
  });

  const result = await uploadFile(req.file, userId, description);

  logger.info('Upload successful', { dataSourceId: result.id });

  ResponseFormatter.created(res, result, 'File uploaded successfully. Processing will begin shortly.');
});

const router = Router();

router.post(
  '/upload',
  requireAuth,
  requireRole(['admin', 'scientist', 'field_technician']),
  upload.single('file'),
  handleMulterError,
  handler
);

export default router;
