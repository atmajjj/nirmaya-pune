import { eq, and } from 'drizzle-orm';
import { db } from '../../../database/drizzle';
import { uploads } from '../upload.schema';
import { Upload, UploadUpdateInput } from '../upload.interface';
import HttpException from '../../../utils/httpException';
import { findUploadById } from '../upload.queries';

class UpdateUploadService {
  /**
   * Update an upload record
   */
  public async updateUpload(
    uploadId: number,
    updateData: UploadUpdateInput,
    userId: number
  ): Promise<Upload> {
    try {
      // First check if upload exists and belongs to user
      const existingUpload = await findUploadById(uploadId, userId);

      if (!existingUpload) {
        throw new HttpException(404, 'Upload not found');
      }

      const [updatedUpload] = await db
        .update(uploads)
        .set({
          ...updateData,
          updated_at: new Date(),
        })
        .where(
          and(eq(uploads.id, uploadId), eq(uploads.user_id, userId), eq(uploads.is_deleted, false))
        )
        .returning();

      if (!updatedUpload) {
        throw new HttpException(500, 'Failed to update upload');
      }

      return {
        ...updatedUpload,
        created_at: updatedUpload.created_at.toISOString(),
        updated_at: updatedUpload.updated_at.toISOString(),
        deleted_at: updatedUpload.deleted_at?.toISOString(),
      } as Upload;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(500, `Error updating upload: ${error.message}`);
    }
  }
}

export default UpdateUploadService;
