import { db } from '../../../database/drizzle';
import { users } from '../../user/user.schema';
import { CreateUser } from '../auth.validation';
import { IAuthUserWithToken } from '../../../interfaces/request.interface';
import HttpException from '../../../utils/httpException';
import bcrypt from 'bcrypt';
import { generateToken } from '../../../utils/jwt';
import { findUserByEmail } from '../../user/user.queries';

class RegisterService {
  /**
   * Register a new user
   */
  public async register(data: CreateUser): Promise<IAuthUserWithToken> {
    try {
      // Check if email already exists
      const existingUser = await findUserByEmail(data.email);

      if (existingUser) {
        throw new HttpException(409, 'Email already registered');
      }

      // Create new user
      const hashedPassword = await bcrypt.hash(data.password, 10);
      const userData = {
        ...data,
        password: hashedPassword,
        created_by: data.created_by || 1, // Default to system user if not provided
      };

      const [newUser] = await db.insert(users).values(userData).returning();

      // Generate token for new user
      const token = generateToken(
        {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
          role: newUser.role,
        },
        '24h'
      );

      return {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        phone_number: newUser.phone_number || undefined,
        role: newUser.role,
        created_at: newUser.created_at,
        updated_at: newUser.updated_at,
        token,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(500, `Error registering user: ${error.message}`);
    }
  }
}

export default RegisterService;
