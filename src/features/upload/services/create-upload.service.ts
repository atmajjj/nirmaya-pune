import { db } from '../../../database/drizzle';
import { uploads } from '../upload.schema';
import { Upload, UploadInput } from '../upload.interface';
import HttpException from '../../../utils/httpException';

class CreateUploadService {
  /**
   * Create a new upload record
   */
  public async createUpload(uploadData: UploadInput): Promise<Upload> {
    try {
      const [upload] = await db.insert(uploads).values(uploadData).returning();

      if (!upload) {
        throw new HttpException(500, 'Failed to create upload record');
      }

      // Convert Date objects to strings for the interface
      return {
        ...upload,
        created_at: upload.created_at.toISOString(),
        updated_at: upload.updated_at.toISOString(),
        deleted_at: upload.deleted_at?.toISOString(),
      } as Upload;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(500, `Error creating upload: ${error.message}`);
    }
  }
}

export default CreateUploadService;
