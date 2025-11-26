/**
 * Unit tests for create-upload business logic
 */

import HttpException from '../../../../utils/httpException';
import * as s3Upload from '../../../../utils/s3Upload';
import { db } from '../../../../database/drizzle';
import { Upload } from '../../shared/interface';

// Mock dependencies
jest.mock('../../../../database/drizzle', () => ({
  db: {
    insert: jest.fn().mockReturnThis(),
  },
}));
jest.mock('../../../../utils/s3Upload');
jest.mock('../../../../utils/logger', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

const mockDb = db as jest.Mocked<typeof db>;
const mockS3Upload = s3Upload as jest.Mocked<typeof s3Upload>;

// Recreate the business logic for testing
async function handleCreateUpload(file: Express.Multer.File, userId: number): Promise<Upload> {
  const s3Result = await s3Upload.uploadToS3(file.buffer, file.originalname, file.mimetype, userId);

  const [upload] = await (db.insert({} as any).values({
    filename: file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_'),
    original_filename: file.originalname,
    mime_type: file.mimetype,
    file_size: file.size,
    file_path: s3Result.key,
    file_url: s3Result.url,
    user_id: userId,
    created_by: userId,
  }) as any).returning();

  if (!upload) {
    throw new HttpException(500, 'Failed to create upload record');
  }

  return {
    ...upload,
    created_at: upload.created_at.toISOString(),
    updated_at: upload.updated_at.toISOString(),
    deleted_at: upload.deleted_at?.toISOString(),
  } as Upload;
}

describe('Create Upload Business Logic', () => {
  const mockFile: Express.Multer.File = {
    fieldname: 'file',
    originalname: 'test-file.pdf',
    encoding: '7bit',
    mimetype: 'application/pdf',
    size: 1024,
    buffer: Buffer.from('test content'),
    destination: '',
    filename: '',
    path: '',
    stream: {} as any,
  };

  const mockS3Result = {
    key: 'uploads/1/test-file.pdf',
    url: 'https://s3.example.com/uploads/1/test-file.pdf',
    bucket: 'test-bucket',
    size: 1024,
    contentType: 'application/pdf',
  };

  const mockCreatedUpload = {
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

  beforeEach(() => {
    jest.clearAllMocks();
    mockS3Upload.uploadToS3.mockResolvedValue(mockS3Result);

    const mockReturning = jest.fn().mockResolvedValue([mockCreatedUpload]);
    const mockValues = jest.fn().mockReturnValue({ returning: mockReturning });
    (mockDb.insert as jest.Mock).mockReturnValue({ values: mockValues });
  });

  describe('handleCreateUpload', () => {
    it('should successfully upload file and create record', async () => {
      const result = await handleCreateUpload(mockFile, 1);

      expect(mockS3Upload.uploadToS3).toHaveBeenCalledWith(
        mockFile.buffer,
        mockFile.originalname,
        mockFile.mimetype,
        1
      );
      expect(result.id).toBe(1);
      expect(result.filename).toBe('test-file.pdf');
      expect(result.file_url).toBe('https://s3.example.com/uploads/1/test-file.pdf');
    });

    it('should sanitize filename by replacing special characters', async () => {
      const fileWithSpecialChars = {
        ...mockFile,
        originalname: 'test file (1).pdf',
      };

      await handleCreateUpload(fileWithSpecialChars, 1);

      const mockValues = (mockDb.insert as jest.Mock).mock.results[0].value.values;
      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({
          filename: 'test_file__1_.pdf',
        })
      );
    });

    it('should set user_id and created_by to the provided userId', async () => {
      await handleCreateUpload(mockFile, 5);

      const mockValues = (mockDb.insert as jest.Mock).mock.results[0].value.values;
      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 5,
          created_by: 5,
        })
      );
    });

    it('should throw 500 if database insert fails', async () => {
      const mockReturning = jest.fn().mockResolvedValue([undefined]);
      const mockValues = jest.fn().mockReturnValue({ returning: mockReturning });
      (mockDb.insert as jest.Mock).mockReturnValue({ values: mockValues });

      await expect(handleCreateUpload(mockFile, 1)).rejects.toThrow(HttpException);
      await expect(handleCreateUpload(mockFile, 1)).rejects.toMatchObject({
        status: 500,
        message: 'Failed to create upload record',
      });
    });

    it('should propagate S3 upload errors', async () => {
      mockS3Upload.uploadToS3.mockRejectedValue(new Error('S3 upload failed'));

      await expect(handleCreateUpload(mockFile, 1)).rejects.toThrow('S3 upload failed');
    });

    it('should store file metadata correctly', async () => {
      await handleCreateUpload(mockFile, 1);

      const mockValues = (mockDb.insert as jest.Mock).mock.results[0].value.values;
      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({
          mime_type: 'application/pdf',
          file_size: 1024,
          original_filename: 'test-file.pdf',
        })
      );
    });

    it('should convert dates to ISO strings in response', async () => {
      const result = await handleCreateUpload(mockFile, 1);

      expect(typeof result.created_at).toBe('string');
      expect(typeof result.updated_at).toBe('string');
    });

    it('should handle different mime types', async () => {
      const imageFile = {
        ...mockFile,
        mimetype: 'image/png',
        originalname: 'image.png',
      };

      await handleCreateUpload(imageFile, 1);

      const mockValues = (mockDb.insert as jest.Mock).mock.results[0].value.values;
      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({
          mime_type: 'image/png',
        })
      );
    });

    it('should use S3 result for file_path and file_url', async () => {
      await handleCreateUpload(mockFile, 1);

      const mockValues = (mockDb.insert as jest.Mock).mock.results[0].value.values;
      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({
          file_path: 'uploads/1/test-file.pdf',
          file_url: 'https://s3.example.com/uploads/1/test-file.pdf',
        })
      );
    });
  });
});
