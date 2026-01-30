import TelegramBot from 'node-telegram-bot-api';
import axios from 'axios';
import FormData from 'form-data';
import { logger } from '../../../utils/logger';
import { generateToken } from '../../../utils/jwt';
import { BOT_CONFIG, BOT_MESSAGES } from '../shared/constants';
import { ProcessingStatus } from '../shared/types';
import { NotificationService } from './notification.service';
import { db } from '../../../database/drizzle';
import { dataSources } from '../../data-sources/shared/schema';
import { eq, and } from 'drizzle-orm';

export class FileHandlerService {
  /**
   * Validate uploaded file
   */
  public validateFile(
    document: TelegramBot.Document
  ): { valid: boolean; error?: string } {
    const fileSize = document.file_size || 0;
    const fileName = document.file_name || '';
    const mimeType = document.mime_type || '';

    // Check file size
    if (fileSize > BOT_CONFIG.MAX_FILE_SIZE) {
      const size = (fileSize / (1024 * 1024)).toFixed(2);
      return {
        valid: false,
        error: BOT_MESSAGES.ERROR_FILE_TOO_LARGE.replace('{fileSize}', `${size} MB`),
      };
    }

    // Check file format
    const allowedExtensions = ['.csv', '.xlsx', '.xls'];
    const allowedMimeTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];

    const hasValidExtension = allowedExtensions.some((ext) =>
      fileName.toLowerCase().endsWith(ext)
    );
    const hasValidMimeType = allowedMimeTypes.includes(mimeType);

    if (!hasValidExtension && !hasValidMimeType) {
      return {
        valid: false,
        error: BOT_MESSAGES.ERROR_INVALID_FORMAT,
      };
    }

    return { valid: true };
  }

  /**
   * Determine correct MIME type from filename extension
   * Telegram sometimes sends generic MIME types, so we check the file extension
   */
  private getMimeTypeFromFilename(fileName: string, fallbackMimeType?: string): string {
    const ext = fileName.toLowerCase().split('.').pop();
    
    switch (ext) {
      case 'csv':
        return 'text/csv';
      case 'xlsx':
        return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      case 'xls':
        return 'application/vnd.ms-excel';
      default:
        // If no recognized extension, try fallback or default to CSV
        return fallbackMimeType || 'text/csv';
    }
  }

  /**
   * Process uploaded file
   */
  public async processFile(
    chatId: number,
    document: TelegramBot.Document,
    bot: TelegramBot,
    notificationService: NotificationService
  ): Promise<void> {
    try {
      // Download file from Telegram
      const fileBuffer = await this.downloadFile(document, bot);

      // Determine correct MIME type from filename
      const fileName = document.file_name || 'water-quality-data.csv';
      const mimeType = this.getMimeTypeFromFilename(fileName, document.mime_type);

      logger.info('Processing file upload', {
        fileName,
        originalMimeType: document.mime_type,
        detectedMimeType: mimeType,
      });

      // Upload to backend
      const uploadId = await this.uploadToBackend(
        fileBuffer,
        fileName,
        mimeType
      );

      logger.info(`File uploaded successfully for chat ${chatId}`, {
        uploadId,
        fileName: document.file_name,
      });

      // Poll for completion and send results
      await this.pollAndNotify(chatId, uploadId, bot, notificationService);

    } catch (error) {
      logger.error('Error processing file', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await bot.sendMessage(
        chatId,
        BOT_MESSAGES.ERROR_PROCESSING.replace('{error}', errorMessage),
        { parse_mode: 'Markdown' }
      );
    }
  }

  /**
   * Download file from Telegram
   */
  private async downloadFile(
    document: TelegramBot.Document,
    bot: TelegramBot
  ): Promise<Buffer> {
    try {
      const fileId = document.file_id;
      const fileLink = await bot.getFileLink(fileId);
      
      const response = await axios.get(fileLink, {
        responseType: 'arraybuffer',
      });

      return Buffer.from(response.data);
    } catch (error) {
      logger.error('Error downloading file from Telegram', error);
      throw new Error('Failed to download file from Telegram');
    }
  }

  /**
   * Upload file to backend
   */
  private async uploadToBackend(
    fileBuffer: Buffer,
    fileName: string,
    mimeType: string
  ): Promise<number> {
    try {
      const formData = new FormData();
      formData.append('file', fileBuffer, {
        filename: fileName,
        contentType: mimeType,
      });
      formData.append('source', 'Telegram Bot Upload');
      formData.append('uploaded_by', 'Telegram Bot User');

      // Generate service token for bot authentication
      // Using id: 0 as a special identifier for service accounts
      const serviceToken = generateToken({ 
        id: 0,
        role: 'scientist' as any, // Service token with scientist permissions
        name: 'Telegram Bot Service',
        email: 'telegram-bot@nirmaya.service'
      }, '1h');

      const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';
      const response = await axios.post(
        `${backendUrl}/api/data-sources/upload`,
        formData,
        {
          headers: {
            ...formData.getHeaders(),
            'Authorization': `Bearer ${serviceToken}`,
          },
          maxBodyLength: Infinity,
          maxContentLength: Infinity,
        }
      );

      // Backend returns: { success: true, data: { id: 29, ... }, message: "..." }
      if (!response.data || !response.data.success || !response.data.data || !response.data.data.id) {
        logger.error('Invalid response from backend:', response.data);
        throw new Error('Invalid response from backend');
      }

      return response.data.data.id;
    } catch (error) {
      logger.error('Error uploading file to backend', error);
      throw new Error('Failed to upload file to backend');
    }
  }

  /**
   * Check upload status
   */
  public async checkUploadStatus(uploadId: number): Promise<ProcessingStatus> {
    try {
      const dataSource = await db.query.dataSources.findFirst({
        where: and(
          eq(dataSources.id, uploadId),
          eq(dataSources.is_deleted, false)
        ),
      });

      if (!dataSource) {
        throw new Error('Upload not found');
      }

      return {
        uploadId: dataSource.id,
        status: dataSource.status,
        calculationStatus: dataSource.calculation_status || undefined,
        calculatedIndices: dataSource.calculated_indices as string[] | undefined,
        error: dataSource.calculation_error || undefined,
      };
    } catch (error) {
      logger.error('Error checking upload status', error);
      throw error;
    }
  }

  /**
   * Poll for calculation completion and notify user
   */
  private async pollAndNotify(
    chatId: number,
    uploadId: number,
    bot: TelegramBot,
    notificationService: NotificationService
  ): Promise<void> {
    let attempts = 0;
    const maxAttempts = BOT_CONFIG.MAX_POLLING_ATTEMPTS;
    const interval = BOT_CONFIG.POLLING_INTERVAL;

    const poll = async () => {
      try {
        attempts++;
        const status = await this.checkUploadStatus(uploadId);

        logger.info(`Polling status for upload ${uploadId}`, {
          attempt: attempts,
          status: status.calculationStatus,
        });

        // Check if completed
        if (status.calculationStatus === 'completed') {
          // Pass dataSourceId (uploadId) directly - notification service will find the calculation
          await notificationService.sendResults(chatId, uploadId, bot);
          return;
        }

        // Check if failed
        if (status.calculationStatus === 'failed') {
          await bot.sendMessage(
            chatId,
            BOT_MESSAGES.ERROR_PROCESSING.replace(
              '{error}',
              status.error || 'Unknown error'
            ),
            { parse_mode: 'Markdown' }
          );
          return;
        }

        // Continue polling
        if (attempts < maxAttempts) {
          setTimeout(poll, interval);
        } else {
          await bot.sendMessage(
            chatId,
            '⏱️ Processing is taking longer than expected. Use /status ' +
              uploadId +
              ' to check progress later.',
            { parse_mode: 'Markdown' }
          );
        }
      } catch (error) {
        logger.error('Error polling upload status', error);
        await bot.sendMessage(chatId, BOT_MESSAGES.ERROR_GENERIC);
      }
    };

    // Start polling after a short delay
    setTimeout(poll, interval);
  }

  /**
   * Get calculation upload ID from data source
   */
  private async getCalculationUploadId(uploadId: number): Promise<number> {
    const dataSource = await db.query.dataSources.findFirst({
      where: and(
        eq(dataSources.id, uploadId),
        eq(dataSources.is_deleted, false)
      ),
    });

    if (!dataSource || !dataSource.calculation_upload_id) {
      throw new Error('Calculation upload ID not found');
    }

    return dataSource.calculation_upload_id;
  }
}
