import { IAuthUserWithToken } from '../../../interfaces/request.interface';
import HttpException from '../../../utils/httpException';
import { verifyToken, generateAccessToken, generateRefreshToken } from '../../../utils/jwt';
import { findUserById } from '../../user/user.queries';

class RefreshTokenService {
  /**
   * Refresh access token using a valid refresh token
   * Implements token rotation for enhanced security
   */
  public async refreshToken(refreshToken: string): Promise<IAuthUserWithToken> {
    try {
      // Verify the refresh token
      const decoded = verifyToken(refreshToken);

      if (typeof decoded === 'string' || !decoded.id) {
        throw new HttpException(401, 'Invalid refresh token format');
      }

      // Get user from database
      const user = await findUserById(decoded.id);

      if (!user) {
        throw new HttpException(404, 'User not found');
      }

      // Generate new tokens (token rotation)
      const accessToken = generateAccessToken({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      });

      const newRefreshToken = generateRefreshToken({
        id: user.id,
      });

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        phone_number: user.phone_number,
        role: user.role,
        created_at: user.created_at,
        updated_at: user.updated_at,
        token: accessToken,
        refreshToken: newRefreshToken,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(500, `Error refreshing token: ${error.message}`);
    }
  }
}

export default RefreshTokenService;
