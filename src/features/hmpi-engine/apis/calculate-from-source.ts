/**
 * POST /api/nirmaya-engine/calculate-from-source
 * Calculate HPI, MI, WQI indices from a pre-uploaded data source
 * 
 * Requires: auth + role (admin, scientist, policymaker)
 * 
 * Input: data_source_id (from data_sources table)
 * Output: Calculated indices for each station in the file
 */

import { Router, Response, Request } from 'express';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import '../../../interfaces/request.interface';
import { requireAuth } from '../../../middlewares/auth.middleware';
import { requireRole } from '../../../middlewares/role.middleware';
import validationMiddleware from '../../../middlewares/validation.middleware';
import { ResponseFormatter } from '../../../utils/responseFormatter';
import { asyncHandler, getUserId } from '../../../utils/controllerHelpers';
import HttpException from '../../../utils/httpException';
import { downloadAsBuffer } from '../../../utils/s3Upload';
import { db } from '../../../database/drizzle';
import { uploads } from '../../upload/shared/schema';
import { findDataSourceById } from '../../data-sources/shared/queries';
import { WaterQualityCalculationService } from '../services/calculation.service';
import { BatchCalculationResult } from '../shared/interface';
import { ReportGeneratorService } from '../../hmpi-report/services/report-generator.service';
import { logger } from '../../../utils/logger';
import { detectDatasetType, getCalculationDescription } from '../../data-sources/services/dataset-type-detector.service';

const bodySchema = z.object({
  data_source_id: z.number().int().positive(),
});

/**
 * Create upload record referencing the data source
 */
async function createUploadFromDataSource(
  dataSourceId: number,
  filename: string,
  mimeType: string,
  fileSize: number,
  filePath: string,
  fileUrl: string,
  userId: number
): Promise<number> {
  // Create upload record
  const [upload] = await db
    .insert(uploads)
    .values({
      filename: filename.replace(/[^a-zA-Z0-9.-]/g, '_'),
      original_filename: filename,
      mime_type: mimeType,
      file_size: fileSize,
      file_path: filePath,
      file_url: fileUrl,
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
 * Process data source file and calculate indices
 */
async function processDataSourceCalculation(
  dataSourceId: number,
  userId: number
): Promise<BatchCalculationResult> {
  // Get data source record
  const dataSource = await findDataSourceById(dataSourceId);
  
  if (!dataSource) {
    throw new HttpException(404, 'Data source not found');
  }

  // Check if data source is available for use
  if (dataSource.status !== 'available') {
    throw new HttpException(
      400,
      `Data source is not available. Current status: ${dataSource.status}`
    );
  }

  // Validate file type
  if (!['csv', 'xlsx', 'xls'].includes(dataSource.file_type)) {
    throw new HttpException(
      400,
      `Unsupported file type: ${dataSource.file_type}. Only CSV and Excel files are supported.`
    );
  }

  // Create upload record
  const uploadId = await createUploadFromDataSource(
    dataSourceId,
    dataSource.filename,
    dataSource.mime_type,
    dataSource.file_size,
    dataSource.file_path,
    dataSource.file_url,
    userId
  );

  try {
    // Download file from S3
    const fileBuffer = await downloadAsBuffer(dataSource.file_path);

    // 🎯 DETECT DATASET TYPE - Determine which indices can be calculated
    const columns = dataSource.metadata?.columns || [];
    if (columns.length === 0) {
      throw new HttpException(400, 'No column metadata available for dataset type detection');
    }

    const detection = detectDatasetType(columns);
    const detectionSummary = getCalculationDescription(detection);
    
    logger.info(`Dataset type detection for data source ${dataSourceId}: ${detectionSummary}`);
    logger.info(`WQI parameters found: ${detection.wqiParametersFound.join(', ') || 'none'}`);
    logger.info(`Metal parameters found: ${detection.metalParametersFound.join(', ') || 'none'}`);

    // Check if at least one index can be calculated
    if (!detection.canCalculateWQI && !detection.canCalculateHPI && !detection.canCalculateMI) {
      throw new HttpException(
        400,
        `Insufficient parameters for calculation. Found ${detection.wqiParametersFound.length} WQI params and ${detection.metalParametersFound.length} metals. Need at least 3 WQI params OR 2 metals.`
      );
    }

    // Process file and calculate indices (only the ones detected as possible)
    // The calculation service already supports both CSV and Excel
    logger.info(`Will calculate: WQI=${detection.canCalculateWQI}, HPI=${detection.canCalculateHPI}, MI=${detection.canCalculateMI}`);
    const result = await WaterQualityCalculationService.processCSV(
      fileBuffer,
      uploadId,
      userId,
      {
        calculateWQI: detection.canCalculateWQI,
        calculateHPI: detection.canCalculateHPI,
        calculateMI: detection.canCalculateMI,
      }
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
            logger.info(`Auto-generated report for upload ${uploadId} from data source ${dataSourceId}`);
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
  const { data_source_id } = req.body;

  // Process data source and calculate indices
  const result = await processDataSourceCalculation(data_source_id, userId);

  // Determine response message based on results
  let message: string;
  if (result.processed_stations === 0) {
    throw new HttpException(
      422,
      `No valid data found in file. ${result.errors.length} errors encountered.`
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

// POST /api/nirmaya-engine/calculate-from-source
// Requires auth and role (admin, scientist, policymaker can calculate)
router.post(
  '/calculate-from-source',
  requireAuth,
  requireRole(['admin', 'scientist', 'policymaker']),
  validationMiddleware(bodySchema),
  handler
);

export default router;
