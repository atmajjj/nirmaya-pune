import { eq } from 'drizzle-orm';
import { db } from '../../../database/drizzle';
import { uploads } from '../upload.schema';
import HttpException from '../../../utils/httpException';
import { findUploadById } from '../upload.queries';

class DeleteUploadService {
  /**
   * Delete an upload (soft delete)
   */
  public async deleteUpload(uploadId: number, userId: number): Promise<void> {
    try {
      // First check if upload exists and belongs to user
      const existingUpload = await findUploadById(uploadId, userId);

      if (!existingUpload) {
        throw new HttpException(404, 'Upload not found');
      }

      const [deletedUpload] = await db
        .update(uploads)
        .set({
          is_deleted: true,
          deleted_by: userId,
          deleted_at: new Date(),
        })
        .where(eq(uploads.id, uploadId))
        .returning();

      if (!deletedUpload) {
        throw new HttpException(500, 'Failed to delete upload');
      }
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(500, `Error deleting upload: ${error.message}`);
    }
  }
}

export default DeleteUploadService;
