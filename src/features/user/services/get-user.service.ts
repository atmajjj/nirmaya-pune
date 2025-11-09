import { IUser } from '../user.interface';
import HttpException from '../../../utils/httpException';
import { findUserById } from '../user.queries';

class GetUserService {
  /**
   * Get user by ID
   */
  public async getUserById(id: number): Promise<IUser> {
    try {
      const user = await findUserById(id);

      if (!user) {
        throw new HttpException(404, 'User not found');
      }

      return user as IUser;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(500, `Error fetching user: ${error.message}`);
    }
  }
}

export default GetUserService;
