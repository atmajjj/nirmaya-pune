import LoginService from '../../services/login.service';
import { findUserByEmail } from '../../../user/user.queries';
import HttpException from '../../../../utils/httpException';
import bcrypt from 'bcrypt';
import { generateToken } from '../../../../utils/jwt';

jest.mock('../../../user/user.queries');
jest.mock('bcrypt');
jest.mock('../../../../utils/jwt');

describe('LoginService', () => {
  let loginService: LoginService;
  const mockFindUserByEmail = findUserByEmail as jest.MockedFunction<typeof findUserByEmail>;
  const mockBcryptCompare = bcrypt.compare as jest.MockedFunction<typeof bcrypt.compare>;
  const mockGenerateToken = generateToken as jest.MockedFunction<typeof generateToken>;

  beforeEach(() => {
    loginService = new LoginService();
    jest.clearAllMocks();
  });

  describe('login', () => {
    const validEmail = 'test@example.com';
    const validPassword = 'password123';
    const mockUser = {
      id: 1,
      name: 'Test User',
      email: validEmail,
      password: '$2b$10$hashedpassword',
      phone_number: '1234567890',
      role: 'user' as const,
      created_by: 1,
      created_at: new Date(),
      updated_by: null,
      updated_at: new Date(),
      is_deleted: false,
      deleted_by: null,
      deleted_at: null,
    };

    it('should successfully login a user with valid credentials', async () => {
      const mockToken = 'mock.jwt.token';
      mockFindUserByEmail.mockResolvedValue(mockUser);
      mockBcryptCompare.mockResolvedValue(true as never);
      mockGenerateToken.mockReturnValue(mockToken);

      const result = await loginService.login(validEmail, validPassword);

      expect(result).toEqual({
        id: mockUser.id,
        name: mockUser.name,
        email: mockUser.email,
        phone_number: mockUser.phone_number,
        role: mockUser.role,
        created_at: mockUser.created_at,
        updated_at: mockUser.updated_at,
        token: mockToken,
      });
      expect(mockFindUserByEmail).toHaveBeenCalledWith(validEmail);
      expect(mockBcryptCompare).toHaveBeenCalledWith(validPassword, mockUser.password);
      expect(mockGenerateToken).toHaveBeenCalledWith(
        {
          id: mockUser.id,
          email: mockUser.email,
          name: mockUser.name,
          role: mockUser.role,
        },
        '24h'
      );
    });

    it('should throw 400 error if email is missing', async () => {
      await expect(loginService.login('', validPassword)).rejects.toThrow(
        new HttpException(400, 'Email and password are required')
      );
      expect(mockFindUserByEmail).not.toHaveBeenCalled();
    });

    it('should throw 400 error if password is missing', async () => {
      await expect(loginService.login(validEmail, '')).rejects.toThrow(
        new HttpException(400, 'Email and password are required')
      );
      expect(mockFindUserByEmail).not.toHaveBeenCalled();
    });

    it('should throw 404 error if user not found', async () => {
      mockFindUserByEmail.mockResolvedValue(undefined);

      await expect(loginService.login(validEmail, validPassword)).rejects.toThrow(
        new HttpException(404, 'Email not registered')
      );
      expect(mockFindUserByEmail).toHaveBeenCalledWith(validEmail);
      expect(mockBcryptCompare).not.toHaveBeenCalled();
    });

    it('should throw 401 error if password is incorrect', async () => {
      mockFindUserByEmail.mockResolvedValue(mockUser);
      mockBcryptCompare.mockResolvedValue(false as never);

      await expect(loginService.login(validEmail, 'wrongpassword')).rejects.toThrow(
        new HttpException(401, 'Incorrect password')
      );
      expect(mockBcryptCompare).toHaveBeenCalledWith('wrongpassword', mockUser.password);
      expect(mockGenerateToken).not.toHaveBeenCalled();
    });

    it('should handle unexpected errors', async () => {
      const error = new Error('Database error');
      mockFindUserByEmail.mockRejectedValue(error);

      await expect(loginService.login(validEmail, validPassword)).rejects.toThrow(
        new HttpException(500, `Error during login: ${error.message}`)
      );
    });
  });
});
