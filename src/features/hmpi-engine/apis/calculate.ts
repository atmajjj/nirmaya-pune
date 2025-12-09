/**
 * POST /api/nirmaya-engine/calculate
 * Upload CSV file and calculate HPI, MI, WQI indices
 * 
 * Requires: auth + role (admin, scientist, policymaker)
 * 
 * Input: CSV file with water quality data
 * Output: Calculated indices for each station in the CSV
 */

import { Router, Response, Request } from 'express';
import { eq } from 'drizzle-orm';
import '../../../interfaces/request.interface';
import { requireAuth } from '../../../middlewares/auth.middleware';
import { requireRole } from '../../../middlewares/role.middleware';
import { uploadCsvMiddleware } from '../../../middlewares/upload.middleware';
import { ResponseFormatter } from '../../../utils/responseFormatter';
import { asyncHandler, getUserId } from '../../../utils/controllerHelpers';
import HttpException from '../../../utils/httpException';
import { uploadToS3 } from '../../../utils/s3Upload';
import { db } from '../../../database/drizzle';
import { uploads } from '../../upload/shared/schema';
import { WaterQualityCalculationService } from '../services/calculation.service';
import { BatchCalculationResult } from '../shared/interface';
import { ReportGeneratorService } from '../../hmpi-report/services/report-generator.service';
import { logger } from '../../../utils/logger';

/**
 * Create upload record and upload to S3
 */
async function createUploadRecord(
  file: Express.Multer.File,
  userId: number
): Promise<number> {
  // Upload to S3
  const s3Result = await uploadToS3(
    file.buffer,
    file.originalname,
    file.mimetype,
    userId
  );

  // Create upload record
  const [upload] = await db
    .insert(uploads)
    .values({
      filename: file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_'),
      original_filename: file.originalname,
      mime_type: file.mimetype,
      file_size: file.size,
      file_path: s3Result.key,
      file_url: s3Result.url,
      user_id: userId,
      created_by: userId,
      updated_by: userId,
      status: 'processing',
    })
    .returning();

  if (!upload) {
    throw new HttpException(500, 'Failed to create upload record');
  }

  return upload.id;
}

/**
 * Update upload status
 */
async function updateUploadStatus(
  uploadId: number,
  status: 'completed' | 'failed',
  errorMessage?: string
): Promise<void> {
  await db
    .update(uploads)
    .set({
      status,
      error_message: errorMessage,
      updated_at: new Date(),
    })
    .where(eq(uploads.id, uploadId));
}

/**
 * Process uploaded CSV file and calculate indices
 */
async function processCSVCalculation(
  file: Express.Multer.File,
  userId: number
): Promise<BatchCalculationResult> {
  // Create upload record first
  const uploadId = await createUploadRecord(file, userId);

  try {
    // Process CSV and calculate indices
    const result = await WaterQualityCalculationService.processCSV(
      file.buffer,
      uploadId,
      userId
    );

    // Update upload status based on result
    if (result.failed_stations === result.total_stations && result.total_stations > 0) {
      await updateUploadStatus(uploadId, 'failed', 'All stations failed processing');
    } else {
      await updateUploadStatus(uploadId, 'completed');
      
      // Automatically trigger report generation in the background (don't wait)
      // Only generate if at least some stations were processed successfully
      if (result.processed_stations > 0) {
        ReportGeneratorService.generateReport(uploadId, userId, 'comprehensive')
          .then(() => {
            logger.info(`Auto-generated report for upload ${uploadId}`);
          })
          .catch(error => {
            logger.error(`Failed to auto-generate report for upload ${uploadId}:`, error);
          });
      }
    }

    return result;
  } catch (error) {
    // Update upload status to failed
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await updateUploadStatus(uploadId, 'failed', errorMessage);
    throw error;
  }
}

const handler = asyncHandler(async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const file = req.file;

  if (!file) {
    throw new HttpException(400, 'No file uploaded. Please upload a CSV file.');
  }

  // File validation already done by uploadCsvMiddleware
  // Process CSV and calculate indices
  const result = await processCSVCalculation(file, userId);

  // Determine response message based on results
  let message: string;
  if (result.processed_stations === 0) {
    throw new HttpException(
      422,
      `No valid data found in CSV. ${result.errors.length} errors encountered.`
    );
  } else if (result.failed_stations > 0) {
    message = `Processed ${result.processed_stations} of ${result.total_stations} stations. ` +
      `${result.failed_stations} stations had errors. Report generation started.`;
  } else {
    message = `Successfully calculated indices for ${result.processed_stations} stations. Report generation started.`;
  }

  ResponseFormatter.created(res, result, message);
});

const router = Router();

// POST /api/hmpi-engine/calculate
// Requires auth and role (admin, scientist, policymaker can calculate)
router.post(
  '/calculate',
  requireAuth,
  requireRole(['admin', 'scientist', 'policymaker']),
  uploadCsvMiddleware,
  handler
);

export default router;
