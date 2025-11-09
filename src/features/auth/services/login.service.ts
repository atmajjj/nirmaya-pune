import { IAuthUserWithToken } from '../../../interfaces/request.interface';
import HttpException from '../../../utils/httpException';
import bcrypt from 'bcrypt';
import { generateToken } from '../../../utils/jwt';
import { findUserByEmail } from '../../user/user.queries';

class LoginService {
  /**
   * Login a user and generate JWT token
   */
  public async login(email: string, password: string): Promise<IAuthUserWithToken> {
    try {
      if (!email || !password) {
        throw new HttpException(400, 'Email and password are required');
      }

      // Find user by email (includes password for authentication)
      const user = await findUserByEmail(email);

      if (!user) {
        throw new HttpException(404, 'Email not registered');
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        throw new HttpException(401, 'Incorrect password');
      }

      const token = generateToken(
        {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
        '24h'
      );

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        phone_number: user.phone_number,
        role: user.role,
        created_at: user.created_at,
        updated_at: user.updated_at,
        token,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(500, `Error during login: ${error.message}`);
    }
  }
}

export default LoginService;
