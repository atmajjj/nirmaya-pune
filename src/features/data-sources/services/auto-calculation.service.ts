/**
 * Auto-Calculation Service
 * Automatically triggers WQI/HPI/MI calculations when field technicians upload data
 */

import { logger } from '../../../utils/logger';
import { downloadAsBuffer } from '../../../utils/s3Upload';
import { findDataSourceById } from '../../data-sources/shared/queries';
import { WaterQualityCalculationService } from '../../hmpi-engine/services/calculation.service';
import { db } from '../../../database/drizzle';
import { dataSources } from '../../data-sources/shared/schema';
import { uploads } from '../../upload/shared/schema';
import { eq } from 'drizzle-orm';
import { uploadToS3 } from '../../../utils/s3Upload';
import { ReportGeneratorService } from '../../hmpi-report/services/report-generator.service';

/**
 * Update data source calculation status
 */
async function updateCalculationStatus(
  dataSourceId: number,
  status: 'calculating' | 'completed' | 'failed',
  uploadId?: number,
  error?: string
): Promise<void> {
  const updates: any = {
    calculation_status: status,
    updated_at: new Date(),
  };

  if (uploadId) {
    updates.calculation_upload_id = uploadId;
  }

  if (error) {
    updates.calculation_error = error;
  }

  if (status === 'completed') {
    updates.calculation_completed_at = new Date();
  }

  await db
    .update(dataSources)
    .set(updates)
    .where(eq(dataSources.id, dataSourceId));
}

/**
 * Create upload record for calculation result
 */
async function createCalculationUpload(
  dataSourceId: number,
  originalFilename: string,
  fileBuffer: Buffer,
  mimetype: string,
  userId: number
): Promise<number> {
  // Re-upload to S3 (calculations need separate upload record)
  const timestamp = Date.now();
  const filename = `calculations/${userId}/${timestamp}-${originalFilename.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
  
  const s3Result = await uploadToS3(
    fileBuffer,
    filename,
    mimetype,
    userId
  );

  // Create upload record
  const [upload] = await db
    .insert(uploads)
    .values({
      filename: originalFilename.replace(/[^a-zA-Z0-9.-]/g, '_'),
      original_filename: originalFilename,
      mime_type: mimetype,
      file_size: fileBuffer.length,
      file_path: s3Result.key,
      file_url: s3Result.url,
      user_id: userId,
      created_by: userId,
      updated_by: userId,
      status: 'processing',
    })
    .returning();

  if (!upload) {
    throw new Error('Failed to create calculation upload record');
  }

  return upload.id;
}

/**
 * Update upload status after calculation
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
 * Automatically calculate indices for uploaded data source
 * Called after successful file parsing
 */
export async function autoCalculateDataSource(
  dataSourceId: number,
  userId: number
): Promise<void> {
  logger.info(`🤖 Auto-calculating indices for data source ${dataSourceId}...`);

  try {
    // Get data source
    const dataSource = await findDataSourceById(dataSourceId);
    if (!dataSource) {
      logger.error(`Data source ${dataSourceId} not found`);
      return;
    }

    // Check if file has enough rows for calculation
    const totalRows = dataSource.metadata?.total_rows || 0;
    if (totalRows === 0) {
      logger.info(`Data source ${dataSourceId} has no rows, skipping auto-calculation`);
      await updateCalculationStatus(dataSourceId, 'failed', undefined, 'No data rows found in file');
      return;
    }

    // Update status to calculating
    await updateCalculationStatus(dataSourceId, 'calculating');

    // Download file from S3
    logger.info(`Downloading file from S3: ${dataSource.file_path}`);
    const fileBuffer = await downloadAsBuffer(dataSource.file_path);

    // Create upload record for this calculation
    const uploadId = await createCalculationUpload(
      dataSourceId,
      dataSource.original_filename,
      fileBuffer,
      dataSource.mime_type,
      userId
    );

    logger.info(`Created calculation upload record: ${uploadId}`);

    try {
      // Process file and calculate indices
      logger.info(`Processing CSV for calculation...`);
      const result = await WaterQualityCalculationService.processCSV(
        fileBuffer,
        uploadId,
        userId
      );

      // Check if calculation was successful
      if (result.processed_stations === 0) {
        // No stations processed
        await updateCalculationStatus(
          dataSourceId,
          'failed',
          uploadId,
          `No valid stations found. ${result.errors.length} errors encountered.`
        );
        await updateUploadStatus(uploadId, 'failed', 'No valid stations processed');
        logger.warn(`Auto-calculation failed for data source ${dataSourceId}: No valid stations`);
        return;
      }

      // Mark upload as completed
      await updateUploadStatus(uploadId, 'completed');

      // Update data source with success
      await updateCalculationStatus(dataSourceId, 'completed', uploadId);

      logger.info(`✅ Auto-calculation completed for data source ${dataSourceId}`);
      logger.info(`Processed ${result.processed_stations} stations, ${result.failed_stations} failed`);

      // Auto-generate comprehensive report in background
      if (result.processed_stations > 0) {
        setImmediate(() => {
          ReportGeneratorService.generateReport(uploadId, userId, 'comprehensive')
            .then(() => {
              logger.info(`📄 Auto-generated report for data source ${dataSourceId}`);
            })
            .catch(error => {
              logger.error(`Failed to auto-generate report for data source ${dataSourceId}:`, error);
            });
        });
      }

    } catch (calcError: any) {
      // Calculation failed
      const errorMsg = calcError.message || 'Calculation failed';
      await updateCalculationStatus(dataSourceId, 'failed', uploadId, errorMsg);
      await updateUploadStatus(uploadId, 'failed', errorMsg);
      logger.error(`Auto-calculation failed for data source ${dataSourceId}:`, calcError);
    }

  } catch (error: any) {
    logger.error(`Fatal error in auto-calculation for data source ${dataSourceId}:`, error);
    await updateCalculationStatus(
      dataSourceId,
      'failed',
      undefined,
      error.message || 'Unknown error'
    );
  }
}
