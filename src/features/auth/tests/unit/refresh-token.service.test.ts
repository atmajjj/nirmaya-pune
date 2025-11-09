import RefreshTokenService from '../../services/refresh-token.service';
import { findUserById } from '../../../user/user.queries';
import HttpException from '../../../../utils/httpException';
import { verifyToken, generateAccessToken, generateRefreshToken } from '../../../../utils/jwt';

jest.mock('../../../user/user.queries');
jest.mock('../../../../utils/jwt');

describe('RefreshTokenService', () => {
  let refreshTokenService: RefreshTokenService;
  const mockFindUserById = findUserById as jest.MockedFunction<typeof findUserById>;
  const mockVerifyToken = verifyToken as jest.MockedFunction<typeof verifyToken>;
  const mockGenerateAccessToken = generateAccessToken as jest.MockedFunction<
    typeof generateAccessToken
  >;
  const mockGenerateRefreshToken = generateRefreshToken as jest.MockedFunction<
    typeof generateRefreshToken
  >;

  beforeEach(() => {
    refreshTokenService = new RefreshTokenService();
    jest.clearAllMocks();
  });

  describe('refreshToken', () => {
    const validRefreshToken = 'valid.refresh.token';
    const mockUser = {
      id: 1,
      name: 'Test User',
      email: 'test@example.com',
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

    it('should successfully refresh tokens with valid refresh token', async () => {
      const mockAccessToken = 'new.access.token';
      const mockNewRefreshToken = 'new.refresh.token';
      const decodedToken = { id: mockUser.id, email: mockUser.email };

      mockVerifyToken.mockReturnValue(decodedToken);
      mockFindUserById.mockResolvedValue(mockUser);
      mockGenerateAccessToken.mockReturnValue(mockAccessToken);
      mockGenerateRefreshToken.mockReturnValue(mockNewRefreshToken);

      const result = await refreshTokenService.refreshToken(validRefreshToken);

      expect(result).toEqual({
        id: mockUser.id,
        name: mockUser.name,
        email: mockUser.email,
        phone_number: mockUser.phone_number,
        role: mockUser.role,
        created_at: mockUser.created_at,
        updated_at: mockUser.updated_at,
        token: mockAccessToken,
        refreshToken: mockNewRefreshToken,
      });
      expect(mockVerifyToken).toHaveBeenCalledWith(validRefreshToken);
      expect(mockFindUserById).toHaveBeenCalledWith(mockUser.id);
      expect(mockGenerateAccessToken).toHaveBeenCalledWith({
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
        role: mockUser.role,
      });
      expect(mockGenerateRefreshToken).toHaveBeenCalledWith({ id: mockUser.id });
    });

    it('should throw 401 error if refresh token is invalid (string)', async () => {
      mockVerifyToken.mockReturnValue('invalid');

      await expect(refreshTokenService.refreshToken(validRefreshToken)).rejects.toThrow(
        new HttpException(401, 'Invalid refresh token format')
      );
      expect(mockFindUserById).not.toHaveBeenCalled();
    });

    it('should throw 401 error if refresh token has no id', async () => {
      mockVerifyToken.mockReturnValue({ email: 'test@example.com' } as any);

      await expect(refreshTokenService.refreshToken(validRefreshToken)).rejects.toThrow(
        new HttpException(401, 'Invalid refresh token format')
      );
      expect(mockFindUserById).not.toHaveBeenCalled();
    });

    it('should throw 404 error if user not found', async () => {
      const decodedToken = { id: 999, email: 'test@example.com' };
      mockVerifyToken.mockReturnValue(decodedToken);
      mockFindUserById.mockResolvedValue(undefined);

      await expect(refreshTokenService.refreshToken(validRefreshToken)).rejects.toThrow(
        new HttpException(404, 'User not found')
      );
      expect(mockGenerateAccessToken).not.toHaveBeenCalled();
    });

    it('should handle unexpected errors', async () => {
      const error = new Error('Token verification failed');
      mockVerifyToken.mockImplementation(() => {
        throw error;
      });

      await expect(refreshTokenService.refreshToken(validRefreshToken)).rejects.toThrow(
        new HttpException(500, `Error refreshing token: ${error.message}`)
      );
    });

    it('should handle HttpException errors without wrapping', async () => {
      const httpError = new HttpException(401, 'Token expired');
      mockVerifyToken.mockImplementation(() => {
        throw httpError;
      });

      await expect(refreshTokenService.refreshToken(validRefreshToken)).rejects.toThrow(httpError);
    });
  });
});
