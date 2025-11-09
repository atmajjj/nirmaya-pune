import { eq } from 'drizzle-orm';
import { db } from '../../../database/drizzle';
import { users } from '../user.schema';
import { UpdateUser } from '../user.validation';
import { IUser } from '../user.interface';
import HttpException from '../../../utils/httpException';
import { findUserById, findUserByEmail } from '../user.queries';
import bcrypt from 'bcrypt';

class UpdateUserService {
  /**
   * Update user data
   */
  public async updateUser(id: number, data: UpdateUser, updatedBy: number): Promise<IUser> {
    try {
      const existingUser = await findUserById(id);

      if (!existingUser) {
        throw new HttpException(404, 'User not found');
      }

      // Check if email is being updated and if it already exists
      if (data.email && data.email !== existingUser.email) {
        const existingUserWithEmail = await findUserByEmail(data.email);

        if (existingUserWithEmail && existingUserWithEmail.id !== id) {
          throw new HttpException(409, 'Email already exists');
        }
      }

      const updateData: Partial<IUser> = {
        ...data,
        updated_by: updatedBy,
      };

      // Hash password if being updated
      if (data.password) {
        updateData.password = await bcrypt.hash(data.password, 10);
      }

      const [result] = await db
        .update(users)
        .set({
          ...updateData,
          updated_at: new Date(),
        })
        .where(eq(users.id, id))
        .returning();

      if (!result) {
        throw new HttpException(500, 'Failed to update user');
      }

      return result as IUser;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(500, `Error updating user: ${error.message}`);
    }
  }
}

export default UpdateUserService;
