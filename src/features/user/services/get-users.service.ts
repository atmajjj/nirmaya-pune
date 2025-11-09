import { eq } from 'drizzle-orm';
import { db } from '../../../database/drizzle';
import { users } from '../user.schema';
import { IUser } from '../user.interface';
import HttpException from '../../../utils/httpException';

class GetUsersService {
  /**
   * Get all users (excluding deleted users)
   */
  public async getAllUsers(): Promise<IUser[]> {
    try {
      const allUsers = await db.select().from(users).where(eq(users.is_deleted, false));
      return allUsers as IUser[];
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(500, `Error fetching users: ${error.message}`);
    }
  }
}

export default GetUsersService;
