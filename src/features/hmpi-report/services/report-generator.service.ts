import { ReportDataService } from './report-data.service';
import { ChartGeneratorService } from './chart-generator.service';
import { PDFGeneratorService } from './pdf-generator.service';
import { createReport, updateReportStatus, updateReport, findReportById } from '../shared/queries';
import { uploadToS3 } from '../../../utils/s3Upload';
import HttpException from '../../../utils/httpException';
import { logger } from '../../../utils/logger';
import type { CreateReportInput } from '../shared/interface';

/**
 * Report Generator Orchestration Service
 * Coordinates the entire report generation pipeline
 */
export class ReportGeneratorService {
  /**
   * Generate complete water quality report
   * Orchestrates data aggregation, chart generation, PDF creation, and S3 upload
   *
   * @param uploadId - ID of the upload with calculations
   * @param userId - ID of the user generating the report
   * @param reportType - Type of report (full, summary, custom)
   * @returns Report record with S3 file details
   */
  static async generateReport(
    uploadId: number,
    userId: number,
    reportType: 'summary' | 'comprehensive' = 'comprehensive'
  ) {
    logger.info(`Starting report generation for upload ${uploadId}`);

    // Step 1: Create initial report record with 'generating' status
    const reportInput: CreateReportInput = {
      upload_id: uploadId,
      report_title: `HMPI Report - Upload ${uploadId}`,
      report_type: reportType,
      file_name: '',  // Will be set after PDF generation
      file_path: '',  // Will be set after S3 upload
      file_url: '',   // Will be set after S3 upload
      file_size: 0,   // Will be set after PDF generation
      total_stations: 0,  // Will be set after data aggregation
      status: 'generating',
      created_by: userId,
    };

    const report = await createReport(reportInput);
    logger.info(`Created report record ${report.id} with status: generating`);

    try {
      // Step 2: Aggregate report data
      logger.info(`Aggregating data for report ${report.id}`);
      const reportData = await ReportDataService.aggregateReportData(uploadId, userId);

      // Step 3: Generate charts
      logger.info(`Generating charts for report ${report.id}`);
      const charts = await ChartGeneratorService.generateAllCharts(reportData);

      // Step 4: Generate PDF
      logger.info(`Generating PDF for report ${report.id}`);
      const pdfBuffer = await PDFGeneratorService.generatePDF(reportData, charts);
      const fileSize = pdfBuffer.length;

      logger.info(`PDF generated successfully, size: ${(fileSize / 1024).toFixed(2)} KB`);

      // Step 5: Upload to S3
      logger.info(`Uploading PDF to S3 for report ${report.id}`);
      const fileName = `hmpi-report-${report.id}-${Date.now()}.pdf`;
      const mimeType = 'application/pdf';

      const { key, url, size } = await uploadToS3(pdfBuffer, fileName, mimeType, userId);
      logger.info(`PDF uploaded to S3: ${key}`);

      // Step 6: Get calculation statistics
      const stats = await ReportDataService.getCalculationStatistics(uploadId);

      // Step 7: Update report record with success
      const updatedReport = await updateReport(report.id, {
        status: 'completed',
        file_name: fileName,
        file_path: key,
        file_url: url,
        file_size: size,
        total_stations: reportData.totalStations,
        avg_hpi: stats.avg_hpi,
        avg_mi: stats.avg_mi,
        avg_wqi: stats.avg_wqi,
        generated_at: new Date(),
        updated_by: userId,
      });

      logger.info(`Report ${report.id} completed successfully`);

      return updatedReport;
    } catch (error) {
      // Update report status to failed
      logger.error(`Report generation failed for report ${report.id}:`, error);

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      await updateReportStatus(report.id, 'failed', errorMessage);

      // Re-throw the error for API layer to handle
      throw new HttpException(
        500,
        `Report generation failed: ${errorMessage}`
      );
    }
  }

  /**
   * Regenerate an existing report
   * Useful if report generation failed or needs refresh
   *
   * @param reportId - ID of the report to regenerate
   * @param userId - ID of the user requesting regeneration
   * @returns Updated report record
   */
  static async regenerateReport(reportId: number, userId: number) {
    logger.info(`Regenerating report ${reportId}`);

    // Get existing report to find upload_id
    const existingReport = await findReportById(reportId);

    if (!existingReport) {
      throw new HttpException(404, 'Report not found');
    }

    // Reset status to generating
    await updateReportStatus(reportId, 'generating');

    try {
      // Follow same generation pipeline
      const reportData = await ReportDataService.aggregateReportData(
        existingReport.upload_id,
        userId
      );

      const charts = await ChartGeneratorService.generateAllCharts(reportData);
      const pdfBuffer = await PDFGeneratorService.generatePDF(reportData, charts);

      // Upload to S3 with new filename
      const fileName = `hmpi-report-${reportId}-regenerated-${Date.now()}.pdf`;
      const { key, url, size } = await uploadToS3(pdfBuffer, fileName, 'application/pdf', userId);

      // Get updated statistics
      const stats = await ReportDataService.getCalculationStatistics(existingReport.upload_id);

      // Update report
      const updatedReport = await updateReport(reportId, {
        status: 'completed',
        file_name: fileName,
        file_path: key,
        file_url: url,
        file_size: size,
        total_stations: reportData.totalStations,
        avg_hpi: stats.avg_hpi,
        avg_mi: stats.avg_mi,
        generated_at: new Date(),
        updated_by: userId,
      });

      logger.info(`Report ${reportId} regenerated successfully`);

      return updatedReport;
    } catch (error) {
      logger.error(`Report regeneration failed for report ${reportId}:`, error);

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      await updateReportStatus(reportId, 'failed', errorMessage);

      throw new HttpException(500, `Report regeneration failed: ${errorMessage}`);
    }
  }

  /**
   * Check if report can be generated for an upload
   * Validates that calculations exist
   *
   * @param uploadId - ID of the upload
   * @returns True if report can be generated
   */
  static async canGenerateReport(uploadId: number): Promise<boolean> {
    return ReportDataService.hasCalculations(uploadId);
  }

  /**
   * Estimate report generation time based on number of stations
   * Returns estimated time in seconds
   *
   * @param totalStations - Number of stations in upload
   * @returns Estimated time in seconds
   */
  static estimateGenerationTime(totalStations: number): number {
    // Base time: 10 seconds for PDF/upload overhead
    let estimatedTime = 10;

    // Chart generation: ~5 seconds
    estimatedTime += 5;

    // Data aggregation: ~0.01 seconds per station
    estimatedTime += totalStations * 0.01;

    // PDF generation: ~0.02 seconds per station (for table rows)
    estimatedTime += totalStations * 0.02;

    return Math.ceil(estimatedTime);
  }

  /**
   * Get report generation progress (for future async implementation)
   * Currently returns mock progress based on status
   *
   * @param reportId - ID of the report
   * @returns Progress percentage (0-100)
   */
  static async getReportProgress(reportId: number): Promise<number> {
    const report = await findReportById(reportId);

    if (!report) {
      throw new HttpException(404, 'Report not found');
    }

    switch (report.status) {
      case 'pending':
        return 0;
      case 'generating':
        return 50; // In future, track actual progress
      case 'completed':
        return 100;
      case 'failed':
        return 0;
      default:
        return 0;
    }
  }
}
