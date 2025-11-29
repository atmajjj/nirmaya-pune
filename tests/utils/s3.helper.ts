/**
 * S3 Test Helper
 * Utility for cleaning up S3 test uploads after tests
 */
import { deleteByPrefixFromS3, deleteFromS3 } from '../../src/utils/s3Upload';
import { logger } from '../../src/utils/logger';

class S3TestHelper {
  private uploadedKeys: string[] = [];

  /**
   * Track an S3 key for cleanup after test
   */
  public trackUpload(key: string): void {
    this.uploadedKeys.push(key);
  }

  /**
   * Delete a specific S3 object
   */
  public async delete(key: string): Promise<void> {
    try {
      await deleteFromS3(key);
    } catch (error) {
      logger.warn(`Failed to delete S3 object: ${key}`, { error });
    }
  }

  /**
   * Delete all objects with a specific prefix
   * Useful for cleaning up all uploads from a test user
   */
  public async deleteByPrefix(prefix: string): Promise<number> {
    try {
      return await deleteByPrefixFromS3(prefix);
    } catch (error) {
      logger.warn(`Failed to delete S3 objects by prefix: ${prefix}`, { error });
      return 0;
    }
  }

  /**
   * Clean up all tracked uploads
   * Call this in afterEach or afterAll
   */
  public async cleanupTracked(): Promise<void> {
    for (const key of this.uploadedKeys) {
      await this.delete(key);
    }
    this.uploadedKeys = [];
  }

  /**
   * Clean up test uploads by user ID prefix
   * Assumes test users have predictable IDs (e.g., 1, 2, etc. after DB reset)
   */
  public async cleanupTestUploads(userIds: number[] = [1, 2, 3, 4, 5]): Promise<number> {
    let totalDeleted = 0;
    for (const userId of userIds) {
      const prefix = `uploads/${userId}/`;
      const count = await this.deleteByPrefix(prefix);
      totalDeleted += count;
    }
    return totalDeleted;
  }

  /**
   * Clean up all chatbot document uploads
   * Chatbot documents are stored with 'chatbot-documents/' prefix
   */
  public async cleanupChatbotDocuments(): Promise<number> {
    try {
      return await this.deleteByPrefix('chatbot-documents/');
    } catch (error) {
      logger.warn('Failed to cleanup chatbot documents from S3', { error });
      return 0;
    }
  }
}

export const s3Helper = new S3TestHelper();
