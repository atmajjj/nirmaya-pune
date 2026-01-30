import { parseDataSourceFile } from '../utils/file-parser';
import { updateDataSourceStatus, findDataSourceById, updateDataSource } from '../shared/queries';
import { logger } from '../../../utils/logger';
import { downloadAsBuffer } from '../../../utils/s3Upload';
import { autoCalculateDataSource } from './auto-calculation.service';

/**
 * Process uploaded data source file
 * Extracts metadata and updates status
 */
export async function processDataSourceFile(dataSourceId: number): Promise<void> {
  try {
    logger.info(`Processing data source ${dataSourceId}...`);
    
    // Get data source record
    const dataSource = await findDataSourceById(dataSourceId);
    if (!dataSource) {
      logger.error(`Data source ${dataSourceId} not found`);
      return;
    }
    
    // Update status to processing
    await updateDataSourceStatus(dataSourceId, 'processing');
    
    try {
      // Download file from S3
      logger.info(`Downloading file from S3: ${dataSource.file_path}`);
      const fileBuffer = await downloadAsBuffer(dataSource.file_path);
      
      // Parse file and extract metadata
      logger.info(`Parsing file with type: ${dataSource.file_type}`);
      const parseResult = await parseDataSourceFile(
        fileBuffer,
        dataSource.file_type as 'csv' | 'xlsx' | 'xls'
      );
      
      if (!parseResult.success) {
        // Mark as failed with error message
        await updateDataSourceStatus(
          dataSourceId,
          'failed',
          parseResult.error || 'Failed to parse file'
        );
        logger.error(`Failed to parse data source ${dataSourceId}: ${parseResult.error}`);
        return;
      }
      
      // Update data source with metadata and mark as available
      // Remove preview_rows from metadata as it's not needed in DB
      const { preview_rows, ...metadataToStore } = parseResult.metadata!;
      
      await updateDataSource(dataSourceId, {
        metadata: metadataToStore,
        status: 'available',
        error_message: null,
      });
      
      logger.info(`Data source ${dataSourceId} processed successfully`);
      logger.info(`Extracted: ${parseResult.metadata?.total_rows} rows, ${parseResult.metadata?.column_count} columns`);
      
      // 🚀 AUTO-CALCULATION: Trigger automatic calculation for this data source
      // Only if file has data rows
      if (metadataToStore.total_rows && metadataToStore.total_rows > 0) {
        logger.info(`🤖 Triggering auto-calculation for data source ${dataSourceId}...`);
        
        // Run in background - don't wait
        setImmediate(() => {
          autoCalculateDataSource(dataSourceId, dataSource.uploaded_by).catch(error => {
            logger.error(`Auto-calculation background task failed for data source ${dataSourceId}:`, error);
          });
        });
      } else {
        logger.info(`Skipping auto-calculation for data source ${dataSourceId} (no data rows)`);
      }
      
    } catch (error: any) {
      // Mark as failed
      const errorMessage = error.message || 'Failed to process file';
      await updateDataSourceStatus(
        dataSourceId,
        'failed',
        errorMessage
      );
      logger.error(`Error processing data source ${dataSourceId}:`, {
        error: error.message,
        stack: error.stack
      });
    }
    
  } catch (error: any) {
    logger.error(`Fatal error processing data source ${dataSourceId}:`, {
      error: error.message,
      stack: error.stack
    });
  }
}

/**
 * Process multiple data sources in batch
 */
export async function processBatchDataSources(dataSourceIds: number[]): Promise<void> {
  logger.info(`Processing batch of ${dataSourceIds.length} data sources...`);
  
  const results = await Promise.allSettled(
    dataSourceIds.map(id => processDataSourceFile(id))
  );
  
  const successful = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;
  
  logger.info(`Batch processing complete: ${successful} successful, ${failed} failed`);
}
