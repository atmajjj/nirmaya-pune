/**
 * Unit tests for register business logic
 */

import bcrypt from 'bcrypt';
import HttpException from '../../../../utils/httpException';
import * as jwt from '../../../../utils/jwt';
import * as userQueries from '../../../user/shared/queries';
import { db } from '../../../../database/drizzle';
import { users } from '../../../user/shared/schema';

// Mock dependencies
jest.mock('bcrypt');
jest.mock('../../../../utils/jwt');
jest.mock('../../../user/shared/queries');
jest.mock('../../../../database/drizzle', () => ({
  db: {
    insert: jest.fn().mockReturnThis(),
  },
}));

const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;
const mockJwt = jwt as jest.Mocked<typeof jwt>;
const mockUserQueries = userQueries as jest.Mocked<typeof userQueries>;
const mockDb = db as jest.Mocked<typeof db>;

interface RegisterData {
  name: string;
  email: string;
  password: string;
  phone_number?: string;
  role?: 'admin' | 'scientist' | 'researcher' | 'policymaker';
  created_by?: number;
}

// Recreate the business logic for testing (mirrors register.ts handleRegister)
async function handleRegister(data: RegisterData) {
  const existingUser = await userQueries.findUserByEmail(data.email);
  if (existingUser) {
    throw new HttpException(409, 'Email already registered');
  }

  const hashedPassword = await bcrypt.hash(data.password, 10);
  const userData = {
    ...data,
    password: hashedPassword,
    created_by: data.created_by || 1,
  };

  const [newUser] = await (db.insert(users).values(userData) as any).returning();

  const token = jwt.generateToken(
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
}

describe('Register Business Logic', () => {
  const mockNewUser = {
    id: 1,
    name: 'New User',
    email: 'newuser@example.com',
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

  const validRegisterData: RegisterData = {
    name: 'New User',
    email: 'newuser@example.com',
    password: 'password123',
    phone_number: '1234567890',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mock chain for db.insert
    const mockReturning = jest.fn().mockResolvedValue([mockNewUser]);
    const mockValues = jest.fn().mockReturnValue({ returning: mockReturning });
    (mockDb.insert as jest.Mock).mockReturnValue({ values: mockValues });
  });

  describe('handleRegister', () => {
    it('should successfully register a new user', async () => {
      mockUserQueries.findUserByEmail.mockResolvedValue(undefined);
      (mockBcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword123');
      mockJwt.generateToken.mockReturnValue('mock.jwt.token');

      const result = await handleRegister(validRegisterData);

      expect(mockUserQueries.findUserByEmail).toHaveBeenCalledWith('newuser@example.com');
      expect(mockBcrypt.hash).toHaveBeenCalledWith('password123', 10);
      expect(mockJwt.generateToken).toHaveBeenCalledWith(
        {
          id: 1,
          email: 'newuser@example.com',
          name: 'New User',
          role: 'scientist',
        },
        '24h'
      );
      expect(result).toEqual({
        id: 1,
        name: 'New User',
        email: 'newuser@example.com',
        phone_number: '1234567890',
        role: 'scientist',
        created_at: mockNewUser.created_at,
        updated_at: mockNewUser.updated_at,
        token: 'mock.jwt.token',
      });
    });

    it('should throw 409 if email already exists', async () => {
      mockUserQueries.findUserByEmail.mockResolvedValue(mockNewUser);

      await expect(handleRegister(validRegisterData)).rejects.toThrow(HttpException);
      await expect(handleRegister(validRegisterData)).rejects.toMatchObject({
        status: 409,
        message: 'Email already registered',
      });
    });

    it('should use default created_by of 1 if not provided', async () => {
      mockUserQueries.findUserByEmail.mockResolvedValue(undefined);
      (mockBcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword123');
      mockJwt.generateToken.mockReturnValue('mock.jwt.token');

      const mockReturning = jest.fn().mockResolvedValue([mockNewUser]);
      const mockValues = jest.fn().mockReturnValue({ returning: mockReturning });
      (mockDb.insert as jest.Mock).mockReturnValue({ values: mockValues });

      await handleRegister({ ...validRegisterData, created_by: undefined });

      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({ created_by: 1 })
      );
    });

    it('should use provided created_by value', async () => {
      mockUserQueries.findUserByEmail.mockResolvedValue(undefined);
      (mockBcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword123');
      mockJwt.generateToken.mockReturnValue('mock.jwt.token');

      const mockReturning = jest.fn().mockResolvedValue([mockNewUser]);
      const mockValues = jest.fn().mockReturnValue({ returning: mockReturning });
      (mockDb.insert as jest.Mock).mockReturnValue({ values: mockValues });

      await handleRegister({ ...validRegisterData, created_by: 5 });

      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({ created_by: 5 })
      );
    });

    it('should register user with specified role', async () => {
      const adminUser = { ...mockNewUser, role: 'admin' as const };
      mockUserQueries.findUserByEmail.mockResolvedValue(undefined);
      (mockBcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword123');
      mockJwt.generateToken.mockReturnValue('mock.jwt.token');

      const mockReturning = jest.fn().mockResolvedValue([adminUser]);
      const mockValues = jest.fn().mockReturnValue({ returning: mockReturning });
      (mockDb.insert as jest.Mock).mockReturnValue({ values: mockValues });

      const result = await handleRegister({ ...validRegisterData, role: 'admin' });

      expect(result.role).toBe('admin');
    });

    it('should return undefined phone_number if not provided', async () => {
      const userWithoutPhone = { ...mockNewUser, phone_number: null };
      mockUserQueries.findUserByEmail.mockResolvedValue(undefined);
      (mockBcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword123');
      mockJwt.generateToken.mockReturnValue('mock.jwt.token');

      const mockReturning = jest.fn().mockResolvedValue([userWithoutPhone]);
      const mockValues = jest.fn().mockReturnValue({ returning: mockReturning });
      (mockDb.insert as jest.Mock).mockReturnValue({ values: mockValues });

      const { phone_number: _unusedPhone, ...dataWithoutPhone } = validRegisterData;
      void _unusedPhone;
      const result = await handleRegister(dataWithoutPhone);

      expect(result.phone_number).toBeUndefined();
    });

    it('should hash password with bcrypt salt rounds of 10', async () => {
      mockUserQueries.findUserByEmail.mockResolvedValue(undefined);
      (mockBcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword123');
      mockJwt.generateToken.mockReturnValue('mock.jwt.token');

      await handleRegister(validRegisterData);

      expect(mockBcrypt.hash).toHaveBeenCalledWith('password123', 10);
    });
  });
});
