import GetUploadsService from '../../services/get-uploads.service';
import HttpException from '../../../../utils/httpException';
import { db } from '../../../../database/drizzle';
import { UploadStatus } from '../../upload.schema';

// Mock the database
jest.mock('../../../../database/drizzle', () => ({
  db: {
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
  },
}));

describe('GetUploadsService', () => {
  let service: GetUploadsService;

  beforeEach(() => {
    service = new GetUploadsService();
    jest.clearAllMocks();
  });

  describe('getAllUploadsByUserId', () => {
    it('should return uploads with default pagination', async () => {
      const mockUploads = [
        {
          id: 1,
          user_id: 1,
          filename: 'test.pdf',
          original_filename: 'original.pdf',
          mime_type: 'application/pdf',
          file_size: 1024,
          file_path: '/uploads/test.pdf',
          file_url: 'https://example.com/uploads/test.pdf',
          status: 'completed' as const,
          error_message: null,
          created_by: 1,
          created_at: new Date('2025-01-01T00:00:00Z'),
          updated_at: new Date('2025-01-01T00:00:00Z'),
          updated_by: null,
          is_deleted: false,
          deleted_at: null,
          deleted_by: null,
        },
      ];

      // Mock count query
      (db.select as jest.Mock).mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([{ total: 1 }]),
        }),
      });

      // Mock data query
      (db.select as jest.Mock).mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            orderBy: jest.fn().mockReturnValue({
              limit: jest.fn().mockReturnValue({
                offset: jest.fn().mockResolvedValue(mockUploads),
              }),
            }),
          }),
        }),
      });

      const result = await service.getAllUploadsByUserId(1);

      expect(result.uploads).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });

    it('should handle database errors', async () => {
      const mockError = new Error('Database connection failed');

      // Mock db query to throw error
      (db.select as jest.Mock).mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockRejectedValue(mockError),
        }),
      });

      await expect(service.getAllUploadsByUserId(1)).rejects.toThrow(HttpException);
      await expect(service.getAllUploadsByUserId(1)).rejects.toThrow(
        'Error fetching uploads: Database connection failed'
      );
    });

    it('should pass filters to query function', async () => {
      const mockUploads: any[] = [];

      // Mock count query
      (db.select as jest.Mock).mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([{ total: 0 }]),
        }),
      });

      // Mock data query
      (db.select as jest.Mock).mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            orderBy: jest.fn().mockReturnValue({
              limit: jest.fn().mockReturnValue({
                offset: jest.fn().mockResolvedValue(mockUploads),
              }),
            }),
          }),
        }),
      });

      const filters = { status: 'completed' as UploadStatus, page: 2, limit: 20 };
      const result = await service.getAllUploadsByUserId(1, filters);

      expect(result.page).toBe(2);
      expect(result.limit).toBe(20);
    });
  });
});
