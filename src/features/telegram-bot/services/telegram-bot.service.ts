import TelegramBot from 'node-telegram-bot-api';
import { logger } from '../../../utils/logger';
import { BOT_MESSAGES } from '../shared/constants';
import { FileHandlerService } from './file-handler.service';
import { NotificationService } from './notification.service';

export class TelegramBotService {
  private static instance: TelegramBotService;
  private bot: TelegramBot | null = null;
  private fileHandler: FileHandlerService;
  private notificationService: NotificationService;
  private activeSessions: Map<number, any> = new Map();

  private constructor() {
    this.fileHandler = new FileHandlerService();
    this.notificationService = new NotificationService();
  }

  public static getInstance(): TelegramBotService {
    if (!TelegramBotService.instance) {
      TelegramBotService.instance = new TelegramBotService();
    }
    return TelegramBotService.instance;
  }

  /**
   * Initialize the Telegram bot
   */
  public async initialize(): Promise<void> {
    const token = process.env.TELEGRAM_BOT_TOKEN;

    if (!token) {
      logger.warn('TELEGRAM_BOT_TOKEN not found in environment variables. Bot will not start.');
      return;
    }

    try {
      // Start polling directly (no webhook cleanup needed for new bots)
      this.bot = new TelegramBot(token, { polling: true });
      this.setupHandlers();
      logger.info('Telegram bot initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Telegram bot', error);
      throw error;
    }
  }

  /**
   * Setup message and command handlers
   */
  private setupHandlers(): void {
    if (!this.bot) return;

    // /start command
    this.bot.onText(/\/start/, (msg) => {
      this.handleStartCommand(msg);
    });

    // /help command
    this.bot.onText(/\/help/, (msg) => {
      this.handleHelpCommand(msg);
    });

    // /upload command
    this.bot.onText(/\/upload/, (msg) => {
      this.handleUploadCommand(msg);
    });

    // /status command
    this.bot.onText(/\/status(?:\s+(\d+))?/, (msg, match) => {
      const uploadId = match?.[1] ? parseInt(match[1], 10) : undefined;
      this.handleStatusCommand(msg, uploadId);
    });

    // /latest command
    this.bot.onText(/\/latest/, (msg) => {
      this.handleLatestCommand(msg);
    });

    // Handle document uploads
    this.bot.on('document', (msg) => {
      this.handleDocumentUpload(msg);
    });

    // Handle errors
    this.bot.on('polling_error', (error) => {
      logger.error('Telegram bot polling error', error);
    });

    logger.info('Telegram bot handlers registered');
  }

  /**
   * Handle /start command
   */
  private async handleStartCommand(msg: TelegramBot.Message): Promise<void> {
    const chatId = msg.chat.id;
    
    try {
      await this.bot?.sendMessage(chatId, BOT_MESSAGES.WELCOME, {
        parse_mode: 'Markdown',
      });

      logger.info(`User ${chatId} started bot`, {
        username: msg.from?.username,
        firstName: msg.from?.first_name,
      });
    } catch (error) {
      logger.error('Error handling /start command', error);
    }
  }

  /**
   * Handle /help command
   */
  private async handleHelpCommand(msg: TelegramBot.Message): Promise<void> {
    const chatId = msg.chat.id;

    try {
      await this.bot?.sendMessage(chatId, BOT_MESSAGES.HELP, {
        parse_mode: 'Markdown',
      });
    } catch (error) {
      logger.error('Error handling /help command', error);
    }
  }

  /**
   * Handle /upload command
   */
  private async handleUploadCommand(msg: TelegramBot.Message): Promise<void> {
    const chatId = msg.chat.id;

    try {
      await this.bot?.sendMessage(chatId, BOT_MESSAGES.UPLOAD_PROMPT, {
        parse_mode: 'Markdown',
      });
    } catch (error) {
      logger.error('Error handling /upload command', error);
    }
  }

  /**
   * Handle /status command
   */
  private async handleStatusCommand(
    msg: TelegramBot.Message,
    uploadId?: number
  ): Promise<void> {
    const chatId = msg.chat.id;

    try {
      if (!uploadId) {
        // Show latest status
        const session = this.activeSessions.get(chatId);
        if (!session) {
          await this.bot?.sendMessage(
            chatId,
            '❌ No active uploads found. Use /latest to see your previous results.'
          );
          return;
        }

        await this.bot?.sendMessage(
          chatId,
          `⏳ *Current Upload Status*\n\nFile: ${session.fileName}\nStatus: ${session.status}\nUpload ID: ${session.uploadId}`,
          { parse_mode: 'Markdown' }
        );
      } else {
        // Check specific upload ID
        const status = await this.fileHandler.checkUploadStatus(uploadId);
        await this.bot?.sendMessage(
          chatId,
          `📊 *Upload Status*\n\nUpload ID: ${uploadId}\nStatus: ${status.status}\nCalculation: ${status.calculationStatus || 'N/A'}`,
          { parse_mode: 'Markdown' }
        );
      }
    } catch (error) {
      logger.error('Error handling /status command', error);
      await this.bot?.sendMessage(chatId, BOT_MESSAGES.ERROR_GENERIC);
    }
  }

  /**
   * Handle /latest command
   */
  private async handleLatestCommand(msg: TelegramBot.Message): Promise<void> {
    const chatId = msg.chat.id;

    try {
      const session = this.activeSessions.get(chatId);
      
      if (!session || session.status !== 'completed') {
        await this.bot?.sendMessage(chatId, BOT_MESSAGES.NO_RESULTS_YET);
        return;
      }

      // Send the latest results
      await this.notificationService.sendResults(
        chatId,
        session.calculationUploadId,
        this.bot!
      );
    } catch (error) {
      logger.error('Error handling /latest command', error);
      await this.bot?.sendMessage(chatId, BOT_MESSAGES.ERROR_GENERIC);
    }
  }

  /**
   * Handle document uploads
   */
  private async handleDocumentUpload(msg: TelegramBot.Message): Promise<void> {
    const chatId = msg.chat.id;
    const document = msg.document;

    if (!document) return;

    try {
      // Validate file
      const validation = this.fileHandler.validateFile(document);
      if (!validation.valid) {
        await this.bot?.sendMessage(chatId, validation.error!, {
          parse_mode: 'Markdown',
        });
        return;
      }

      // Send acknowledgment
      const fileSize = this.formatFileSize(document.file_size || 0);
      const message = BOT_MESSAGES.FILE_RECEIVED
        .replace('{fileName}', document.file_name || 'unknown')
        .replace('{fileSize}', fileSize);

      await this.bot?.sendMessage(chatId, message, {
        parse_mode: 'Markdown',
      });

      // Process the file
      await this.fileHandler.processFile(
        chatId,
        document,
        this.bot!,
        this.notificationService
      );

    } catch (error) {
      logger.error('Error handling document upload', error);
      await this.bot?.sendMessage(chatId, BOT_MESSAGES.ERROR_GENERIC);
    }
  }

  /**
   * Format file size for display
   */
  private formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  /**
   * Get bot instance
   */
  public getBot(): TelegramBot | null {
    return this.bot;
  }

  /**
   * Store active session
   */
  public setSession(chatId: number, session: any): void {
    this.activeSessions.set(chatId, session);
  }

  /**
   * Get active session
   */
  public getSession(chatId: number): any {
    return this.activeSessions.get(chatId);
  }

  /**
   * Stop the bot
   */
  public stop(): void {
    if (this.bot) {
      this.bot.stopPolling();
      logger.info('Telegram bot stopped');
    }
  }
}
