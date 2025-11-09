import { eq, and, count, desc, asc } from 'drizzle-orm';
import { db } from '../../../database/drizzle';
import { uploads, type Upload as DrizzleUpload, UploadStatus } from '../upload.schema';
import { Upload } from '../upload.interface';
import HttpException from '../../../utils/httpException';
import { findUploadById } from '../upload.queries';

class GetUploadsService {
  /**
   * Convert Drizzle upload to interface Upload
   */
  private convertUpload(upload: DrizzleUpload): Upload {
    return {
      ...upload,
      created_at: upload.created_at.toISOString(),
      updated_at: upload.updated_at.toISOString(),
      deleted_at: upload.deleted_at?.toISOString(),
    } as Upload;
  }

  /**
   * Get uploads with pagination and filtering from database
   */
  private async getUserUploadsWithPagination(
    userId: number,
    filters: {
      status?: UploadStatus;
      mime_type?: string;
      page?: number;
      limit?: number;
      sort_by?: 'created_at' | 'file_size' | 'original_filename';
      sort_order?: 'asc' | 'desc';
    } = {}
  ) {
    const {
      status,
      mime_type,
      page = 1,
      limit = 10,
      sort_by = 'created_at',
      sort_order = 'desc',
    } = filters;

    // Build conditions
    const conditions = [eq(uploads.user_id, userId), eq(uploads.is_deleted, false)];

    if (status) {
      conditions.push(eq(uploads.status, status));
    }
    if (mime_type) {
      conditions.push(eq(uploads.mime_type, mime_type));
    }

    // Get total count
    const [{ total }] = await db
      .select({ total: count() })
      .from(uploads)
      .where(and(...conditions));

    // Get paginated uploads
    const orderFn = sort_order === 'desc' ? desc : asc;
    const sortField = uploads[sort_by];

    const uploadsList = await db
      .select()
      .from(uploads)
      .where(and(...conditions))
      .orderBy(orderFn(sortField))
      .limit(limit)
      .offset((page - 1) * limit);

    return {
      uploads: uploadsList,
      total: Number(total),
      page,
      limit,
    };
  }

  /**
   * Get uploads by status for a user
   */
  private async getUserUploadsByStatus(
    userId: number,
    status: UploadStatus
  ): Promise<DrizzleUpload[]> {
    return await db
      .select()
      .from(uploads)
      .where(
        and(eq(uploads.user_id, userId), eq(uploads.status, status), eq(uploads.is_deleted, false))
      );
  }

  /**
   * Get all uploads for a user with pagination and filtering
   */
  public async getAllUploadsByUserId(
    userId: number,
    filters: {
      status?: UploadStatus;
      mime_type?: string;
      page?: number;
      limit?: number;
      sort_by?: 'created_at' | 'file_size' | 'original_filename';
      sort_order?: 'asc' | 'desc';
    } = {}
  ): Promise<{ uploads: Upload[]; total: number; page: number; limit: number }> {
    try {
      const result = await this.getUserUploadsWithPagination(userId, filters);

      return {
        uploads: result.uploads.map(u => this.convertUpload(u)),
        total: result.total,
        page: result.page,
        limit: result.limit,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(500, `Error fetching uploads: ${error.message}`);
    }
  }

  /**
   * Get upload by ID
   */
  public async getUploadById(uploadId: number, userId?: number): Promise<Upload> {
    try {
      const upload = await findUploadById(uploadId, userId);

      if (!upload) {
        throw new HttpException(404, 'Upload not found');
      }

      return this.convertUpload(upload);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(500, `Error fetching upload: ${error.message}`);
    }
  }

  /**
   * Get uploads by status
   */
  public async getUploadsByStatus(userId: number, status: UploadStatus): Promise<Upload[]> {
    try {
      const uploadsList = await this.getUserUploadsByStatus(userId, status);
      return uploadsList.map(u => this.convertUpload(u));
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(500, `Error fetching uploads by status: ${error.message}`);
    }
  }
}

export default GetUploadsService;
