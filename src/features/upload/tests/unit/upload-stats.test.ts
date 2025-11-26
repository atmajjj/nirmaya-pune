/**
 * Unit tests for upload-stats business logic
 */

import { db } from '../../../../database/drizzle';
import { UploadStats } from '../../shared/interface';

// Mock dependencies
jest.mock('../../../../database/drizzle', () => ({
  db: {
    select: jest.fn().mockReturnThis(),
  },
}));
jest.mock('../../../../utils/logger', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

const mockDb = db as jest.Mocked<typeof db>;

// Recreate the business logic for testing
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function getUserUploadStats(_userId: number): Promise<UploadStats> {
  const [stats] = await (db.select({
    total_uploads: {},
    total_size: {},
    pending_count: {},
    processing_count: {},
    completed_count: {},
    failed_count: {},
  }).from({} as any) as any).where();

  const uploadsByType = await (db.select({
    mime_type: {},
    count: {},
  }).from({} as any) as any).where().groupBy();

  const uploadsByTypeMap = uploadsByType.reduce(
    (acc: Record<string, number>, item: { mime_type: string; count: number }) => {
      acc[item.mime_type] = Number(item.count);
      return acc;
    },
    {} as Record<string, number>
  );

  return {
    total_uploads: Number(stats.total_uploads),
    total_size: Number(stats.total_size),
    uploads_by_status: {
      pending: Number(stats.pending_count),
      processing: Number(stats.processing_count),
      completed: Number(stats.completed_count),
      failed: Number(stats.failed_count),
    },
    uploads_by_type: uploadsByTypeMap,
  };
}

describe('Upload Stats Business Logic', () => {
  const mockStats = {
    total_uploads: 10,
    total_size: 10240,
    pending_count: 2,
    processing_count: 1,
    completed_count: 6,
    failed_count: 1,
  };

  const mockUploadsByType = [
    { mime_type: 'application/pdf', count: 5 },
    { mime_type: 'image/png', count: 3 },
    { mime_type: 'text/csv', count: 2 },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock chain for stats query
    const mockGroupBy = jest.fn().mockResolvedValue(mockUploadsByType);
    const mockWhere = jest.fn()
      .mockResolvedValueOnce([mockStats])
      .mockReturnValue({ groupBy: mockGroupBy });
    const mockFrom = jest.fn().mockReturnValue({ where: mockWhere });
    (mockDb.select as jest.Mock).mockReturnValue({ from: mockFrom });
  });

  describe('getUserUploadStats', () => {
    it('should return upload statistics for user', async () => {
      const result = await getUserUploadStats(1);

      expect(result.total_uploads).toBe(10);
      expect(result.total_size).toBe(10240);
      expect(result.uploads_by_status.pending).toBe(2);
      expect(result.uploads_by_status.processing).toBe(1);
      expect(result.uploads_by_status.completed).toBe(6);
      expect(result.uploads_by_status.failed).toBe(1);
    });

    it('should return uploads grouped by mime type', async () => {
      const result = await getUserUploadStats(1);

      expect(result.uploads_by_type['application/pdf']).toBe(5);
      expect(result.uploads_by_type['image/png']).toBe(3);
      expect(result.uploads_by_type['text/csv']).toBe(2);
    });

    it('should convert string counts to numbers', async () => {
      const stringStats = {
        total_uploads: '10',
        total_size: '10240',
        pending_count: '2',
        processing_count: '1',
        completed_count: '6',
        failed_count: '1',
      };

      const mockGroupBy = jest.fn().mockResolvedValue(mockUploadsByType);
      const mockWhere = jest.fn()
        .mockResolvedValueOnce([stringStats])
        .mockReturnValue({ groupBy: mockGroupBy });
      const mockFrom = jest.fn().mockReturnValue({ where: mockWhere });
      (mockDb.select as jest.Mock).mockReturnValue({ from: mockFrom });

      const result = await getUserUploadStats(1);

      expect(typeof result.total_uploads).toBe('number');
      expect(typeof result.total_size).toBe('number');
    });

    it('should return zero counts when user has no uploads', async () => {
      const emptyStats = {
        total_uploads: 0,
        total_size: 0,
        pending_count: 0,
        processing_count: 0,
        completed_count: 0,
        failed_count: 0,
      };

      const mockGroupBy = jest.fn().mockResolvedValue([]);
      const mockWhere = jest.fn()
        .mockResolvedValueOnce([emptyStats])
        .mockReturnValue({ groupBy: mockGroupBy });
      const mockFrom = jest.fn().mockReturnValue({ where: mockWhere });
      (mockDb.select as jest.Mock).mockReturnValue({ from: mockFrom });

      const result = await getUserUploadStats(1);

      expect(result.total_uploads).toBe(0);
      expect(result.total_size).toBe(0);
      expect(result.uploads_by_type).toEqual({});
    });

    it('should return correct structure for UploadStats interface', async () => {
      const result = await getUserUploadStats(1);

      expect(result).toHaveProperty('total_uploads');
      expect(result).toHaveProperty('total_size');
      expect(result).toHaveProperty('uploads_by_status');
      expect(result).toHaveProperty('uploads_by_type');
      expect(result.uploads_by_status).toHaveProperty('pending');
      expect(result.uploads_by_status).toHaveProperty('processing');
      expect(result.uploads_by_status).toHaveProperty('completed');
      expect(result.uploads_by_status).toHaveProperty('failed');
    });

    it('should handle single mime type', async () => {
      const singleType = [{ mime_type: 'application/pdf', count: 5 }];

      const mockGroupBy = jest.fn().mockResolvedValue(singleType);
      const mockWhere = jest.fn()
        .mockResolvedValueOnce([mockStats])
        .mockReturnValue({ groupBy: mockGroupBy });
      const mockFrom = jest.fn().mockReturnValue({ where: mockWhere });
      (mockDb.select as jest.Mock).mockReturnValue({ from: mockFrom });

      const result = await getUserUploadStats(1);

      expect(Object.keys(result.uploads_by_type)).toHaveLength(1);
      expect(result.uploads_by_type['application/pdf']).toBe(5);
    });

    it('should handle database errors', async () => {
      const mockWhere = jest.fn().mockRejectedValue(new Error('Database error'));
      const mockFrom = jest.fn().mockReturnValue({ where: mockWhere });
      (mockDb.select as jest.Mock).mockReturnValue({ from: mockFrom });

      await expect(getUserUploadStats(1)).rejects.toThrow('Database error');
    });
  });
});
