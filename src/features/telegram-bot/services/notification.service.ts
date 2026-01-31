import TelegramBot from 'node-telegram-bot-api';
import { logger } from '../../../utils/logger';
import { BOT_MESSAGES } from '../shared/constants';
import { db } from '../../../database/drizzle';
import { waterQualityCalculations } from '../../hmpi-engine/shared/schema';
import { uploads } from '../../upload/shared/schema';
import { dataSources } from '../../data-sources/shared/schema';
import { eq, and, desc } from 'drizzle-orm';

export class NotificationService {
  /**
   * Send calculation results to user
   */
  public async sendResults(
    chatId: number,
    dataSourceId: number,
    bot: TelegramBot
  ): Promise<void> {
    try {
      logger.info('Attempting to send results', { chatId, dataSourceId });
      
      // First get the data source to find the calculation_upload_id
      const dataSource = await db.query.dataSources.findFirst({
        where: and(
          eq(dataSources.id, dataSourceId),
          eq(dataSources.is_deleted, false)
        ),
      });

      if (!dataSource || !dataSource.calculation_upload_id) {
        logger.warn('No calculation upload found for data source', { dataSourceId });
        await bot.sendMessage(
          chatId,
          '⚠️ Calculation results not found. Processing may still be in progress.',
          { parse_mode: 'Markdown' }
        );
        return;
      }

      const calculationUploadId = dataSource.calculation_upload_id;
      logger.info('Found calculation upload', { dataSourceId, calculationUploadId });
      
      // Get the calculation records using the calculation_upload_id
      const calculation = await db.query.waterQualityCalculations.findFirst({
        where: and(
          eq(waterQualityCalculations.upload_id, calculationUploadId),
          eq(waterQualityCalculations.is_deleted, false)
        ),
        orderBy: [desc(waterQualityCalculations.created_at)],
      });

      logger.info('Calculation query result', { 
        calculationUploadId, 
        found: !!calculation,
        hasUploadId: !!calculation?.upload_id 
      });

      if (!calculation || !calculation.upload_id) {
        logger.warn('No calculation found for upload', { uploadId: calculationUploadId });
        await bot.sendMessage(
          chatId,
          '⚠️ Calculation results not found. Processing may still be in progress.',
          { parse_mode: 'Markdown' }
        );
        return;
      }

      // Get the upload record (contains S3 URL)
      const calcUpload = await db.query.uploads.findFirst({
        where: and(
          eq(uploads.id, calculation.upload_id),
          eq(uploads.is_deleted, false)
        ),
      });

      if (!calcUpload) {
        logger.warn('No upload found for calculation', { uploadId: calculation.upload_id });
        await bot.sendMessage(
          chatId,
          '⚠️ Results file not found. Please try again later.',
          { parse_mode: 'Markdown' }
        );
        return;
      }

      // Send completion message
      const paramsAnalyzed = calculation.params_analyzed || '';
      let indicesList = 'None calculated';
      if (paramsAnalyzed) {
        const params = paramsAnalyzed.split(',').map((p: string) => p.trim());
        if (params.length > 0) {
          indicesList = params.map((param: string) => `✓ ${param}`).join('\n');
        }
      }

      const message = BOT_MESSAGES.PROCESSING_COMPLETE.replace(
        '{indices}',
        indicesList
      );

      await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });

      // Send CSV file directly from S3
      await this.sendCSVFromS3(chatId, calcUpload, bot);

      await bot.sendMessage(
        chatId,
        '✅ *All done!*\n\nUse /upload to analyze another file.',
        { parse_mode: 'Markdown' }
      );

      logger.info(`Results sent to chat ${chatId}`, { dataSourceId, uploadId: calcUpload.id });
    } catch (error) {
      logger.error('Error sending results', error);
      await bot.sendMessage(chatId, BOT_MESSAGES.ERROR_GENERIC);
    }
  }

  /**
   * Generate CSV from calculation results in database and send to user
   */
  private async sendCSVFromS3(
    chatId: number,
    calcUpload: any,
    bot: TelegramBot
  ): Promise<void> {
    try {
      await bot.sendMessage(chatId, '📊 Generating results CSV...');

      // Query all calculation results from database
      const calculations = await db.query.waterQualityCalculations.findMany({
        where: and(
          eq(waterQualityCalculations.upload_id, calcUpload.id),
          eq(waterQualityCalculations.is_deleted, false)
        ),
        orderBy: [waterQualityCalculations.station_id],
      });

      if (!calculations || calculations.length === 0) {
        logger.warn('No calculations found to export', { uploadId: calcUpload.id });
        await bot.sendMessage(
          chatId,
          '⚠️ No calculation results found. Please try again later.'
        );
        return;
      }

      logger.info('Generating CSV from calculations', { count: calculations.length });

      // Helper function to safely format numbers
      const formatNumber = (value: any, decimals: number): string => {
        if (value === null || value === undefined || value === '') return '';
        const num = typeof value === 'string' ? parseFloat(value) : value;
        return isNaN(num) ? '' : num.toFixed(decimals);
      };

      // Generate CSV content
      const headers = [
        'Station ID',
        'HPI',
        'HPI Classification',
        'MI',
        'MI Classification',
        'MI Class',
        'Metals Analyzed',
        'Params Analyzed'
      ];

      const rows = calculations.map((calc: any) => [
        calc.station_id || '',
        formatNumber(calc.hpi, 2),
        calc.hpi_classification || '',
        formatNumber(calc.mi, 4),
        calc.mi_classification || '',
        calc.mi_class || '',
        calc.metals_analyzed || '',
        calc.params_analyzed || ''
      ]);

      // Convert to CSV format
      const csvLines = [headers.join(',')];
      for (const row of rows) {
        csvLines.push(row.map(cell => `"${cell}"`).join(','));
      }
      const csvContent = csvLines.join('\n');
      const csvBuffer = Buffer.from(csvContent, 'utf-8');

      const filename = `water-quality-results-${calcUpload.id}.csv`;

      logger.info('Sending CSV to Telegram', { 
        size: csvBuffer.length, 
        rows: calculations.length,
        filename 
      });

      // Send as document
      await bot.sendDocument(
        chatId,
        csvBuffer,
        {
          caption: `📊 Water Quality Results\n\n✅ ${calculations.length} stations analyzed`,
        },
        {
          filename: filename,
          contentType: 'text/csv',
        }
      );

      logger.info(`CSV sent to chat ${chatId}`);
    } catch (error: any) {
      logger.error('Error generating and sending CSV', { 
        error: error.message,
        uploadId: calcUpload?.id 
      });
      await bot.sendMessage(
        chatId,
        '⚠️ Could not generate CSV file. Please try again later.'
      );
    }
  }

  /**
   * Send error notification
   */
  public async sendError(
    chatId: number,
    error: string,
    bot: TelegramBot
  ): Promise<void> {
    try {
      await bot.sendMessage(
        chatId,
        BOT_MESSAGES.ERROR_PROCESSING.replace('{error}', error),
        { parse_mode: 'Markdown' }
      );
    } catch (err) {
      logger.error('Error sending error notification', err);
    }
  }
}
