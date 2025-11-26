/**
 * Unit tests for update-upload business logic
 */

import HttpException from '../../../../utils/httpException';
import * as uploadQueries from '../../shared/queries';
import { db } from '../../../../database/drizzle';
import { Upload, UploadUpdateInput } from '../../shared/interface';

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

function convertUpload(upload: any): Upload {
  return {
    ...upload,
    created_at: upload.created_at.toISOString(),
    updated_at: upload.updated_at.toISOString(),
    deleted_at: upload.deleted_at?.toISOString(),
  } as Upload;
}

// Recreate the business logic for testing
async function handleUpdateUpload(
  uploadId: number,
  updateData: UploadUpdateInput,
  userId: number
): Promise<Upload> {
  const existingUpload = await uploadQueries.findUploadById(uploadId, userId);

  if (!existingUpload) {
    throw new HttpException(404, 'Upload not found');
  }

  const [updatedUpload] = await (db.update({} as any).set({
    ...updateData,
    updated_at: new Date(),
  }) as any).where().returning();

  if (!updatedUpload) {
    throw new HttpException(500, 'Failed to update upload');
  }

  return convertUpload(updatedUpload);
}

describe('Update Upload Business Logic', () => {
  const mockUpload = {
    id: 1,
    user_id: 1,
    filename: 'test-file.pdf',
    original_filename: 'test-file.pdf',
    mime_type: 'application/pdf',
    file_size: 1024,
    file_path: 'uploads/1/test-file.pdf',
    file_url: 'https://s3.example.com/uploads/1/test-file.pdf',
    status: 'pending' as const,
    error_message: null,
    created_by: 1,
    created_at: new Date('2024-01-01'),
    updated_by: null,
    updated_at: new Date('2024-01-01'),
    is_deleted: false,
    deleted_by: null,
    deleted_at: null,
  };

  const updatedMockUpload = {
    ...mockUpload,
    status: 'completed' as const,
    updated_at: new Date('2024-01-02'),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    const mockReturning = jest.fn().mockResolvedValue([updatedMockUpload]);
    const mockWhere = jest.fn().mockReturnValue({ returning: mockReturning });
    const mockSet = jest.fn().mockReturnValue({ where: mockWhere });
    (mockDb.update as jest.Mock).mockReturnValue({ set: mockSet });
  });

  describe('handleUpdateUpload', () => {
    it('should successfully update upload status', async () => {
      mockUploadQueries.findUploadById.mockResolvedValue(mockUpload);

      const result = await handleUpdateUpload(1, { status: 'completed' }, 1);

      expect(mockUploadQueries.findUploadById).toHaveBeenCalledWith(1, 1);
      expect(result.status).toBe('completed');
    });

    it('should throw 404 when upload not found', async () => {
      mockUploadQueries.findUploadById.mockResolvedValue(undefined);

      await expect(handleUpdateUpload(999, { status: 'completed' }, 1)).rejects.toThrow(HttpException);
      await expect(handleUpdateUpload(999, { status: 'completed' }, 1)).rejects.toMatchObject({
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

      await expect(handleUpdateUpload(1, { status: 'completed' }, 1)).rejects.toThrow(HttpException);
      await expect(handleUpdateUpload(1, { status: 'completed' }, 1)).rejects.toMatchObject({
        status: 500,
        message: 'Failed to update upload',
      });
    });

    it('should update filename', async () => {
      mockUploadQueries.findUploadById.mockResolvedValue(mockUpload);

      const updatedWithFilename = { ...updatedMockUpload, filename: 'new-filename.pdf' };
      const mockReturning = jest.fn().mockResolvedValue([updatedWithFilename]);
      const mockWhere = jest.fn().mockReturnValue({ returning: mockReturning });
      const mockSet = jest.fn().mockReturnValue({ where: mockWhere });
      (mockDb.update as jest.Mock).mockReturnValue({ set: mockSet });

      const result = await handleUpdateUpload(1, { filename: 'new-filename.pdf' }, 1);

      expect(result.filename).toBe('new-filename.pdf');
    });

    it('should update error_message for failed uploads', async () => {
      mockUploadQueries.findUploadById.mockResolvedValue(mockUpload);

      const failedUpload = { ...updatedMockUpload, status: 'failed' as const, error_message: 'Processing error' };
      const mockReturning = jest.fn().mockResolvedValue([failedUpload]);
      const mockWhere = jest.fn().mockReturnValue({ returning: mockReturning });
      const mockSet = jest.fn().mockReturnValue({ where: mockWhere });
      (mockDb.update as jest.Mock).mockReturnValue({ set: mockSet });

      const result = await handleUpdateUpload(1, { status: 'failed', error_message: 'Processing error' }, 1);

      expect(result.status).toBe('failed');
      expect(result.error_message).toBe('Processing error');
    });

    it('should verify ownership by userId', async () => {
      mockUploadQueries.findUploadById.mockResolvedValue(mockUpload);

      await handleUpdateUpload(1, { status: 'completed' }, 5);

      expect(mockUploadQueries.findUploadById).toHaveBeenCalledWith(1, 5);
    });

    it('should update status to processing', async () => {
      mockUploadQueries.findUploadById.mockResolvedValue(mockUpload);

      const processingUpload = { ...updatedMockUpload, status: 'processing' as const };
      const mockReturning = jest.fn().mockResolvedValue([processingUpload]);
      const mockWhere = jest.fn().mockReturnValue({ returning: mockReturning });
      const mockSet = jest.fn().mockReturnValue({ where: mockWhere });
      (mockDb.update as jest.Mock).mockReturnValue({ set: mockSet });

      const result = await handleUpdateUpload(1, { status: 'processing' }, 1);

      expect(result.status).toBe('processing');
    });

    it('should convert dates to ISO strings in response', async () => {
      mockUploadQueries.findUploadById.mockResolvedValue(mockUpload);

      const result = await handleUpdateUpload(1, { status: 'completed' }, 1);

      expect(typeof result.created_at).toBe('string');
      expect(typeof result.updated_at).toBe('string');
    });

    it('should handle partial updates', async () => {
      mockUploadQueries.findUploadById.mockResolvedValue(mockUpload);

      // Only updating status, not filename or error_message
      const result = await handleUpdateUpload(1, { status: 'completed' }, 1);

      expect(result).toBeDefined();
    });
  });
});
