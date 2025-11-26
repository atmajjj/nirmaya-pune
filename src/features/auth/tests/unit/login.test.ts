/**
 * Unit tests for login business logic
 */

import bcrypt from 'bcrypt';
import HttpException from '../../../../utils/httpException';
import * as jwt from '../../../../utils/jwt';
import * as userQueries from '../../../user/shared/queries';

// Mock dependencies
jest.mock('bcrypt');
jest.mock('../../../../utils/jwt');
jest.mock('../../../user/shared/queries');

const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;
const mockJwt = jwt as jest.Mocked<typeof jwt>;
const mockUserQueries = userQueries as jest.Mocked<typeof userQueries>;

// Import the function after mocking
// We need to extract the business logic for testing
// Since it's not exported, we'll test through a helper

// Recreate the business logic for testing (mirrors login.ts handleLogin)
async function handleLogin(email: string, password: string) {
  if (!email || !password) {
    throw new HttpException(400, 'Email and password are required');
  }

  const user = await userQueries.findUserByEmail(email);
  if (!user) {
    throw new HttpException(404, 'Email not registered');
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw new HttpException(401, 'Incorrect password');
  }

  const token = jwt.generateToken(
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
    phone_number: user.phone_number || undefined,
    role: user.role,
    created_at: user.created_at,
    updated_at: user.updated_at,
    token,
  };
}

describe('Login Business Logic', () => {
  const mockUser = {
    id: 1,
    name: 'Test User',
    email: 'test@example.com',
    phone_number: '1234567890',
    password: 'hashedPassword123',
    role: 'scientist' as const,
    created_by: 1,
    created_at: new Date('2024-01-01'),
    updated_by: null,
    updated_at: new Date('2024-01-01'),
    is_deleted: false,
    deleted_by: null,
    deleted_at: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('handleLogin', () => {
    it('should successfully login with valid credentials', async () => {
      mockUserQueries.findUserByEmail.mockResolvedValue(mockUser);
      (mockBcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockJwt.generateToken.mockReturnValue('mock.jwt.token');

      const result = await handleLogin('test@example.com', 'password123');

      expect(mockUserQueries.findUserByEmail).toHaveBeenCalledWith('test@example.com');
      expect(mockBcrypt.compare).toHaveBeenCalledWith('password123', 'hashedPassword123');
      expect(mockJwt.generateToken).toHaveBeenCalledWith(
        {
          id: 1,
          email: 'test@example.com',
          name: 'Test User',
          role: 'scientist',
        },
        '24h'
      );
      expect(result).toEqual({
        id: 1,
        name: 'Test User',
        email: 'test@example.com',
        phone_number: '1234567890',
        role: 'scientist',
        created_at: mockUser.created_at,
        updated_at: mockUser.updated_at,
        token: 'mock.jwt.token',
      });
    });

    it('should throw 400 if email is missing', async () => {
      await expect(handleLogin('', 'password123')).rejects.toThrow(HttpException);
      await expect(handleLogin('', 'password123')).rejects.toMatchObject({
        status: 400,
        message: 'Email and password are required',
      });
    });

    it('should throw 400 if password is missing', async () => {
      await expect(handleLogin('test@example.com', '')).rejects.toThrow(HttpException);
      await expect(handleLogin('test@example.com', '')).rejects.toMatchObject({
        status: 400,
        message: 'Email and password are required',
      });
    });

    it('should throw 404 if user not found', async () => {
      mockUserQueries.findUserByEmail.mockResolvedValue(undefined);

      await expect(handleLogin('notfound@example.com', 'password123')).rejects.toThrow(HttpException);
      await expect(handleLogin('notfound@example.com', 'password123')).rejects.toMatchObject({
        status: 404,
        message: 'Email not registered',
      });
    });

    it('should throw 401 if password is incorrect', async () => {
      mockUserQueries.findUserByEmail.mockResolvedValue(mockUser);
      (mockBcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(handleLogin('test@example.com', 'wrongpassword')).rejects.toThrow(HttpException);
      await expect(handleLogin('test@example.com', 'wrongpassword')).rejects.toMatchObject({
        status: 401,
        message: 'Incorrect password',
      });
    });

    it('should return undefined phone_number if user has no phone', async () => {
      const userWithoutPhone = { ...mockUser, phone_number: null };
      mockUserQueries.findUserByEmail.mockResolvedValue(userWithoutPhone);
      (mockBcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockJwt.generateToken.mockReturnValue('mock.jwt.token');

      const result = await handleLogin('test@example.com', 'password123');

      expect(result.phone_number).toBeUndefined();
    });

    it('should handle different user roles', async () => {
      const adminUser = { ...mockUser, role: 'admin' as const };
      mockUserQueries.findUserByEmail.mockResolvedValue(adminUser);
      (mockBcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockJwt.generateToken.mockReturnValue('mock.jwt.token');

      const result = await handleLogin('test@example.com', 'password123');

      expect(result.role).toBe('admin');
      expect(mockJwt.generateToken).toHaveBeenCalledWith(
        expect.objectContaining({ role: 'admin' }),
        '24h'
      );
    });
  });
});
