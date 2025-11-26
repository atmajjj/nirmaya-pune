import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { dbHelper } from './database.helper';
import { TestUser } from './factories';
import { users } from '../../src/features/user/shared/schema';
import { UserRole } from '../../src/features/user/shared/schema';

export class AuthTestHelper {
  static generateJwtToken(userId: number, email: string, role: string = 'scientist'): string {
    const secret = process.env.JWT_SECRET || 'test-jwt-secret';
    return jwt.sign({ id: userId, email, role }, secret, { expiresIn: '24h' });
  }

  static async hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, 12);
  }

  static async createTestUser(userData: TestUser): Promise<{
    user: { id: number; email: string; name: string; role: string };
    token: string;
  }> {
    const hashedPassword = await this.hashPassword(userData.password);

    const [user] = await dbHelper
      .getDb()
      .insert(users)
      .values({
        email: userData.email,
        name: userData.name,
        password: hashedPassword,
        role: (userData.role || 'scientist') as UserRole,
        created_by: 1,
      })
      .returning();

    const token = this.generateJwtToken(user.id, user.email, user.role);
    return { user, token };
  }

  static async createTestUserWithToken(): Promise<{
    user: { id: number; email: string; name: string; role: string };
    token: string;
    rawPassword: string;
  }> {
    const rawPassword = 'TestPassword123!';
    const userData = {
      email: `testuser.${Date.now()}@example.com`,
      password: rawPassword,
      name: 'Test User',
    };

    const { user, token } = await this.createTestUser(userData);
    return { user, token, rawPassword };
  }

  static getAuthHeaders(token: string): { Authorization: string } {
    return { Authorization: `Bearer ${token}` };
  }

  static verifyToken(token: string): { id: number; email: string; iat: number; exp: number } {
    const secret = process.env.JWT_SECRET || 'test-jwt-secret';
    return jwt.verify(token, secret) as { id: number; email: string; iat: number; exp: number };
  }
}
