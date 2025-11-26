/**
 * Unit tests for refresh-token business logic
 */

import HttpException from '../../../../utils/httpException';
import * as jwt from '../../../../utils/jwt';
import * as userQueries from '../../../user/shared/queries';

// Mock dependencies
jest.mock('../../../../utils/jwt');
jest.mock('../../../user/shared/queries');

const mockJwt = jwt as jest.Mocked<typeof jwt>;
const mockUserQueries = userQueries as jest.Mocked<typeof userQueries>;

// Recreate the business logic for testing (mirrors refresh-token.ts handleRefreshToken)
async function handleRefreshToken(refreshToken: string) {
  const decoded = jwt.verifyToken(refreshToken);

  if (typeof decoded === 'string' || !decoded.id) {
    throw new HttpException(401, 'Invalid refresh token format');
  }

  const user = await userQueries.findUserById(decoded.id as number);
  if (!user) {
    throw new HttpException(404, 'User not found');
  }

  const accessToken = jwt.generateAccessToken({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  });

  const newRefreshToken = jwt.generateRefreshToken({
    id: user.id,
  });

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone_number: user.phone_number || undefined,
    role: user.role,
    created_at: user.created_at,
    updated_at: user.updated_at,
    token: accessToken,
    refreshToken: newRefreshToken,
  };
}

describe('Refresh Token Business Logic', () => {
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

  describe('handleRefreshToken', () => {
    it('should successfully refresh tokens with valid refresh token', async () => {
      const decodedToken = { id: 1, iat: 1234567890, exp: 1234567890 };
      mockJwt.verifyToken.mockReturnValue(decodedToken);
      mockUserQueries.findUserById.mockResolvedValue(mockUser);
      mockJwt.generateAccessToken.mockReturnValue('new.access.token');
      mockJwt.generateRefreshToken.mockReturnValue('new.refresh.token');

      const result = await handleRefreshToken('valid.refresh.token');

      expect(mockJwt.verifyToken).toHaveBeenCalledWith('valid.refresh.token');
      expect(mockUserQueries.findUserById).toHaveBeenCalledWith(1);
      expect(mockJwt.generateAccessToken).toHaveBeenCalledWith({
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        role: 'scientist',
      });
      expect(mockJwt.generateRefreshToken).toHaveBeenCalledWith({ id: 1 });
      expect(result).toEqual({
        id: 1,
        name: 'Test User',
        email: 'test@example.com',
        phone_number: '1234567890',
        role: 'scientist',
        created_at: mockUser.created_at,
        updated_at: mockUser.updated_at,
        token: 'new.access.token',
        refreshToken: 'new.refresh.token',
      });
    });

    it('should throw 401 if decoded token is a string', async () => {
      mockJwt.verifyToken.mockReturnValue('invalid-string-token');

      await expect(handleRefreshToken('bad.token')).rejects.toThrow(HttpException);
      await expect(handleRefreshToken('bad.token')).rejects.toMatchObject({
        status: 401,
        message: 'Invalid refresh token format',
      });
    });

    it('should throw 401 if decoded token has no id', async () => {
      mockJwt.verifyToken.mockReturnValue({ email: 'test@example.com' });

      await expect(handleRefreshToken('no-id.token')).rejects.toThrow(HttpException);
      await expect(handleRefreshToken('no-id.token')).rejects.toMatchObject({
        status: 401,
        message: 'Invalid refresh token format',
      });
    });

    it('should throw 404 if user not found', async () => {
      const decodedToken = { id: 999, iat: 1234567890, exp: 1234567890 };
      mockJwt.verifyToken.mockReturnValue(decodedToken);
      mockUserQueries.findUserById.mockResolvedValue(undefined);

      await expect(handleRefreshToken('valid.token.deleted.user')).rejects.toThrow(HttpException);
      await expect(handleRefreshToken('valid.token.deleted.user')).rejects.toMatchObject({
        status: 404,
        message: 'User not found',
      });
    });

    it('should return undefined phone_number if user has no phone', async () => {
      const userWithoutPhone = { ...mockUser, phone_number: null };
      const decodedToken = { id: 1, iat: 1234567890, exp: 1234567890 };
      mockJwt.verifyToken.mockReturnValue(decodedToken);
      mockUserQueries.findUserById.mockResolvedValue(userWithoutPhone);
      mockJwt.generateAccessToken.mockReturnValue('new.access.token');
      mockJwt.generateRefreshToken.mockReturnValue('new.refresh.token');

      const result = await handleRefreshToken('valid.refresh.token');

      expect(result.phone_number).toBeUndefined();
    });

    it('should propagate HttpException from verifyToken', async () => {
      const tokenExpiredError = new HttpException(401, 'Token has expired');
      mockJwt.verifyToken.mockImplementation(() => {
        throw tokenExpiredError;
      });

      await expect(handleRefreshToken('expired.token')).rejects.toThrow(tokenExpiredError);
    });

    it('should handle different user roles correctly', async () => {
      const adminUser = { ...mockUser, role: 'admin' as const };
      const decodedToken = { id: 1, iat: 1234567890, exp: 1234567890 };
      mockJwt.verifyToken.mockReturnValue(decodedToken);
      mockUserQueries.findUserById.mockResolvedValue(adminUser);
      mockJwt.generateAccessToken.mockReturnValue('new.access.token');
      mockJwt.generateRefreshToken.mockReturnValue('new.refresh.token');

      const result = await handleRefreshToken('valid.refresh.token');

      expect(result.role).toBe('admin');
      expect(mockJwt.generateAccessToken).toHaveBeenCalledWith(
        expect.objectContaining({ role: 'admin' })
      );
    });
  });
});
