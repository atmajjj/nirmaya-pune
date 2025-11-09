import { eq } from 'drizzle-orm';
import { db } from '../../../database/drizzle';
import { users } from '../user.schema';
import HttpException from '../../../utils/httpException';
import { findUserById } from '../user.queries';

class DeleteUserService {
  /**
   * Soft delete a user
   */
  public async deleteUser(id: number, deletedBy: number): Promise<void> {
    try {
      // Find user (excluding deleted users)
      const existingUser = await findUserById(id);

      if (!existingUser) {
        throw new HttpException(404, 'User not found');
      }

      // Soft delete user
      await db
        .update(users)
        .set({
          is_deleted: true,
          deleted_by: deletedBy,
          deleted_at: new Date(),
        })
        .where(eq(users.id, id));
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(500, `Error deleting user: ${error.message}`);
    }
  }
}

export default DeleteUserService;
