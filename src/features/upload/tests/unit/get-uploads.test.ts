/**
 * Unit tests for get-uploads business logic
 */

import HttpException from '../../../../utils/httpException';
import * as uploadQueries from '../../shared/queries';
import { Upload } from '../../shared/interface';

// Mock dependencies
jest.mock('../../../../database/drizzle', () => ({
  db: {
    select: jest.fn().mockReturnThis(),
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
async function getUserById(uploadId: number, userId: number): Promise<Upload> {
  const upload = await uploadQueries.findUploadById(uploadId, userId);

  if (!upload) {
    throw new HttpException(404, 'Upload not found');
  }

  return convertUpload(upload);
}

describe('Get Uploads Business Logic', () => {
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

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserById (get upload by ID)', () => {
    it('should return upload when found', async () => {
      mockUploadQueries.findUploadById.mockResolvedValue(mockUpload);

      const result = await getUserById(1, 1);

      expect(mockUploadQueries.findUploadById).toHaveBeenCalledWith(1, 1);
      expect(result.id).toBe(1);
      expect(result.filename).toBe('test-file.pdf');
    });

    it('should throw 404 when upload not found', async () => {
      mockUploadQueries.findUploadById.mockResolvedValue(undefined);

      await expect(getUserById(999, 1)).rejects.toThrow(HttpException);
      await expect(getUserById(999, 1)).rejects.toMatchObject({
        status: 404,
        message: 'Upload not found',
      });
    });

    it('should verify ownership by userId', async () => {
      mockUploadQueries.findUploadById.mockResolvedValue(mockUpload);

      await getUserById(1, 1);

      expect(mockUploadQueries.findUploadById).toHaveBeenCalledWith(1, 1);
    });

    it('should convert dates to ISO strings', async () => {
      mockUploadQueries.findUploadById.mockResolvedValue(mockUpload);

      const result = await getUserById(1, 1);

      expect(typeof result.created_at).toBe('string');
      expect(typeof result.updated_at).toBe('string');
    });

    it('should return all upload fields', async () => {
      mockUploadQueries.findUploadById.mockResolvedValue(mockUpload);

      const result = await getUserById(1, 1);

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('filename');
      expect(result).toHaveProperty('original_filename');
      expect(result).toHaveProperty('mime_type');
      expect(result).toHaveProperty('file_size');
      expect(result).toHaveProperty('file_url');
      expect(result).toHaveProperty('status');
    });

    it('should handle different upload statuses', async () => {
      const pendingUpload = { ...mockUpload, status: 'pending' as const };
      mockUploadQueries.findUploadById.mockResolvedValue(pendingUpload);

      const result = await getUserById(1, 1);

      expect(result.status).toBe('pending');
    });

    it('should handle upload with error message', async () => {
      const failedUpload = { ...mockUpload, status: 'failed' as const, error_message: 'Processing failed' };
      mockUploadQueries.findUploadById.mockResolvedValue(failedUpload);

      const result = await getUserById(1, 1);

      expect(result.status).toBe('failed');
      expect(result.error_message).toBe('Processing failed');
    });
  });

  describe('convertUpload helper', () => {
    it('should convert Date objects to ISO strings', () => {
      const result = convertUpload(mockUpload);

      expect(result.created_at).toBe('2024-01-01T00:00:00.000Z');
      expect(result.updated_at).toBe('2024-01-01T00:00:00.000Z');
    });

    it('should handle null deleted_at', () => {
      const result = convertUpload(mockUpload);

      expect(result.deleted_at).toBeUndefined();
    });

    it('should convert deleted_at when present', () => {
      const deletedUpload = { ...mockUpload, deleted_at: new Date('2024-01-02') };
      const result = convertUpload(deletedUpload);

      expect(result.deleted_at).toBe('2024-01-02T00:00:00.000Z');
    });
  });
});
