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
import path from 'path';

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB for CSV/Excel files
  },
  fileFilter: (req, file, cb) => {
    // Allow CSV and Excel files
    const allowedMimeTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];
    
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new HttpException(400, 'Invalid file type. Only CSV, XLS, and XLSX files are allowed.') as any, false);
    }
  },
});

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
  processDataSourceFile(dataSource.id).catch(error => {
    console.error(`Background processing failed for data source ${dataSource.id}:`, error);
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
  if (!req.file) {
    throw new HttpException(400, 'No file uploaded');
  }

  const { description } = req.body;
  const userId = req.userId!;

  const result = await uploadFile(req.file, userId, description);

  ResponseFormatter.created(res, result, 'File uploaded successfully. Processing will begin shortly.');
});

const router = Router();

router.post(
  '/upload',
  requireAuth,
  requireRole('field_technician'),
  upload.single('file'),
  handler
);

export default router;
