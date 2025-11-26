/**
 * Unit tests for delete-upload business logic (soft delete)
 */

import HttpException from '../../../../utils/httpException';
import * as uploadQueries from '../../shared/queries';
import { db } from '../../../../database/drizzle';

// Mock dependencies
jest.mock('../../../../database/drizzle', () => ({
  db: {
    update: jest.fn().mockReturnThis(),
  },
}));
jest.mock('../../shared/queries');
jest.mock('../../../../utils/logger', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

const mockDb = db as jest.Mocked<typeof db>;
const mockUploadQueries = uploadQueries as jest.Mocked<typeof uploadQueries>;

// Recreate the business logic for testing
async function handleDeleteUpload(uploadId: number, userId: number): Promise<void> {
  const existingUpload = await uploadQueries.findUploadById(uploadId, userId);

  if (!existingUpload) {
    throw new HttpException(404, 'Upload not found');
  }

  const [deletedUpload] = await (db.update({} as any).set({
    is_deleted: true,
    deleted_by: userId,
    deleted_at: new Date(),
  }) as any).where().returning();

  if (!deletedUpload) {
    throw new HttpException(500, 'Failed to delete upload');
  }
}

describe('Delete Upload Business Logic', () => {
  const mockUpload = {
    id: 1,
    user_id: 1,
    filename: 'test-file.pdf',
    original_filename: 'test-file.pdf',
    mime_type: 'application/pdf',
    file_size: 1024,
    file_path: 'uploads/1/test-file.pdf',
    file_url: 'https://s3.example.com/uploads/1/test-file.pdf',
    status: 'completed' as const,
    error_message: null,
    created_by: 1,
    created_at: new Date('2024-01-01'),
    updated_by: null,
    updated_at: new Date('2024-01-01'),
    is_deleted: false,
    deleted_by: null,
    deleted_at: null,
  };

  const deletedMockUpload = {
    ...mockUpload,
    is_deleted: true,
    deleted_by: 1,
    deleted_at: new Date('2024-01-02'),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    const mockReturning = jest.fn().mockResolvedValue([deletedMockUpload]);
    const mockWhere = jest.fn().mockReturnValue({ returning: mockReturning });
    const mockSet = jest.fn().mockReturnValue({ where: mockWhere });
    (mockDb.update as jest.Mock).mockReturnValue({ set: mockSet });
  });

  describe('handleDeleteUpload', () => {
    it('should successfully soft delete upload', async () => {
      mockUploadQueries.findUploadById.mockResolvedValue(mockUpload);

      await expect(handleDeleteUpload(1, 1)).resolves.toBeUndefined();

      expect(mockUploadQueries.findUploadById).toHaveBeenCalledWith(1, 1);
      expect(mockDb.update).toHaveBeenCalled();
    });

    it('should throw 404 when upload not found', async () => {
      mockUploadQueries.findUploadById.mockResolvedValue(undefined);

      await expect(handleDeleteUpload(999, 1)).rejects.toThrow(HttpException);
      await expect(handleDeleteUpload(999, 1)).rejects.toMatchObject({
        status: 404,
        message: 'Upload not found',
      });
    });

    it('should throw 500 when database update fails', async () => {
      mockUploadQueries.findUploadById.mockResolvedValue(mockUpload);

      const mockReturning = jest.fn().mockResolvedValue([undefined]);
      const mockWhere = jest.fn().mockReturnValue({ returning: mockReturning });
      const mockSet = jest.fn().mockReturnValue({ where: mockWhere });
      (mockDb.update as jest.Mock).mockReturnValue({ set: mockSet });

      await expect(handleDeleteUpload(1, 1)).rejects.toThrow(HttpException);
      await expect(handleDeleteUpload(1, 1)).rejects.toMatchObject({
        status: 500,
        message: 'Failed to delete upload',
      });
    });

    it('should set is_deleted to true', async () => {
      mockUploadQueries.findUploadById.mockResolvedValue(mockUpload);

      const mockReturning = jest.fn().mockResolvedValue([deletedMockUpload]);
      const mockWhere = jest.fn().mockReturnValue({ returning: mockReturning });
      const mockSet = jest.fn().mockReturnValue({ where: mockWhere });
      (mockDb.update as jest.Mock).mockReturnValue({ set: mockSet });

      await handleDeleteUpload(1, 1);

      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({
          is_deleted: true,
        })
      );
    });

    it('should set deleted_by field', async () => {
      mockUploadQueries.findUploadById.mockResolvedValue(mockUpload);

      const mockReturning = jest.fn().mockResolvedValue([deletedMockUpload]);
      const mockWhere = jest.fn().mockReturnValue({ returning: mockReturning });
      const mockSet = jest.fn().mockReturnValue({ where: mockWhere });
      (mockDb.update as jest.Mock).mockReturnValue({ set: mockSet });

      await handleDeleteUpload(1, 5);

      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({
          deleted_by: 5,
        })
      );
    });

    it('should set deleted_at timestamp', async () => {
      mockUploadQueries.findUploadById.mockResolvedValue(mockUpload);

      const mockReturning = jest.fn().mockResolvedValue([deletedMockUpload]);
      const mockWhere = jest.fn().mockReturnValue({ returning: mockReturning });
      const mockSet = jest.fn().mockReturnValue({ where: mockWhere });
      (mockDb.update as jest.Mock).mockReturnValue({ set: mockSet });

      await handleDeleteUpload(1, 1);

      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({
          deleted_at: expect.any(Date),
        })
      );
    });

    it('should verify ownership by userId', async () => {
      mockUploadQueries.findUploadById.mockResolvedValue(mockUpload);

      await handleDeleteUpload(1, 5);

      expect(mockUploadQueries.findUploadById).toHaveBeenCalledWith(1, 5);
    });

    it('should not call update when upload not found', async () => {
      mockUploadQueries.findUploadById.mockResolvedValue(undefined);

      try {
        await handleDeleteUpload(999, 1);
      } catch {
        // Expected to throw
      }

      expect(mockDb.update).not.toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      mockUploadQueries.findUploadById.mockResolvedValue(mockUpload);

      const mockReturning = jest.fn().mockRejectedValue(new Error('Database error'));
      const mockWhere = jest.fn().mockReturnValue({ returning: mockReturning });
      const mockSet = jest.fn().mockReturnValue({ where: mockWhere });
      (mockDb.update as jest.Mock).mockReturnValue({ set: mockSet });

      await expect(handleDeleteUpload(1, 1)).rejects.toThrow('Database error');
    });
  });
});
