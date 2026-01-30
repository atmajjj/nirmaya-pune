export interface TelegramUploadSession {
  chatId: number;
  uploadId: number;
  fileName: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  calculationUploadId?: number;
  startedAt: Date;
}

export interface BotUserInfo {
  chatId: number;
  username?: string;
  firstName?: string;
  lastName?: string;
}

export interface ProcessingStatus {
  uploadId: number;
  status: string;
  calculationStatus?: string;
  calculatedIndices?: string[];
  error?: string;
}
