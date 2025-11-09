import RegisterService from '../../services/register.service';
import { findUserByEmail } from '../../../user/user.queries';
import { db } from '../../../../database/drizzle';
import HttpException from '../../../../utils/httpException';
import bcrypt from 'bcrypt';
import { generateToken } from '../../../../utils/jwt';

jest.mock('../../../user/user.queries');
jest.mock('../../../../database/drizzle', () => ({
  db: {
    insert: jest.fn(),
  },
}));
jest.mock('bcrypt');
jest.mock('../../../../utils/jwt');

describe('RegisterService', () => {
  let registerService: RegisterService;
  const mockFindUserByEmail = findUserByEmail as jest.MockedFunction<typeof findUserByEmail>;
  const mockBcryptHash = bcrypt.hash as jest.MockedFunction<typeof bcrypt.hash>;
  const mockGenerateToken = generateToken as jest.MockedFunction<typeof generateToken>;

  beforeEach(() => {
    registerService = new RegisterService();
    jest.clearAllMocks();
  });

  describe('register', () => {
    const validUserData = {
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
      phone_number: '1234567890',
      role: 'user' as const,
      created_by: 1,
    };

    const mockNewUser = {
      id: 1,
      name: validUserData.name,
      email: validUserData.email,
      password: '$2b$10$hashedpassword',
      phone_number: validUserData.phone_number,
      role: validUserData.role,
      created_by: validUserData.created_by,
      created_at: new Date(),
      updated_by: null,
      updated_at: new Date(),
      is_deleted: false,
      deleted_by: null,
      deleted_at: null,
    };

    it('should successfully register a new user', async () => {
      const mockToken = 'mock.jwt.token';
      const hashedPassword = '$2b$10$hashedpassword';

      mockFindUserByEmail.mockResolvedValue(undefined);
      mockBcryptHash.mockResolvedValue(hashedPassword as never);
      mockGenerateToken.mockReturnValue(mockToken);

      const mockInsert = jest.fn().mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([mockNewUser]),
        }),
      });
      (db.insert as jest.Mock) = mockInsert;

      const result = await registerService.register(validUserData);

      expect(result).toEqual({
        id: mockNewUser.id,
        name: mockNewUser.name,
        email: mockNewUser.email,
        phone_number: mockNewUser.phone_number,
        role: mockNewUser.role,
        created_at: mockNewUser.created_at,
        updated_at: mockNewUser.updated_at,
        token: mockToken,
      });
      expect(mockFindUserByEmail).toHaveBeenCalledWith(validUserData.email);
      expect(mockBcryptHash).toHaveBeenCalledWith(validUserData.password, 10);
    });

    it('should throw 409 error if email already exists', async () => {
      mockFindUserByEmail.mockResolvedValue({
        id: 2,
        email: validUserData.email,
      } as any);

      await expect(registerService.register(validUserData)).rejects.toThrow(
        new HttpException(409, 'Email already registered')
      );
      expect(mockBcryptHash).not.toHaveBeenCalled();
    });

    it('should handle unexpected errors', async () => {
      const error = new Error('Database error');
      mockFindUserByEmail.mockRejectedValue(error);

      await expect(registerService.register(validUserData)).rejects.toThrow(
        new HttpException(500, `Error registering user: ${error.message}`)
      );
    });

    it('should handle HttpException errors without wrapping', async () => {
      const httpError = new HttpException(500, 'Service unavailable');
      mockFindUserByEmail.mockRejectedValue(httpError);

      await expect(registerService.register(validUserData)).rejects.toThrow(httpError);
    });
  });
});
