import { eq, and } from 'drizzle-orm';
import { db } from '../../../database/drizzle';
import { uploads, type Upload as DrizzleUpload } from './schema';

/**
 * Find upload by ID (excluding deleted uploads)
 * Shared query used across multiple services
 * @param id - Upload ID
 * @param userId - Optional user ID for ownership verification
 */
export const findUploadById = async (
  id: number,
  userId?: number
): Promise<DrizzleUpload | undefined> => {
  const conditions = [eq(uploads.id, id), eq(uploads.is_deleted, false)];

  if (userId !== undefined) {
    conditions.push(eq(uploads.user_id, userId));
  }

  const [upload] = await db
    .select()
    .from(uploads)
    .where(and(...conditions))
    .limit(1);

  return upload;
};
