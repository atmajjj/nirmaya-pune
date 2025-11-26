import jwt, { SignOptions } from 'jsonwebtoken';
import HttpException from './httpException';
import { logger } from './logger';
import { config } from './validateEnv';

/**
 * Generate a JWT token with the provided payload
 * @param payload - Data to encode in the token
 * @param expiresIn - Token expiration time (default: '1d')
 * @returns Signed JWT token string
 */
export const generateToken = (payload: object, expiresIn: string = '1d'): string => {
  try {
    return jwt.sign(payload, config.JWT_SECRET, { expiresIn } as SignOptions);
  } catch (error) {
    const err = error as Error;
    logger.error('Error generating token:', err);
    throw new HttpException(500, `Error generating token: ${err.message}`);
  }
};

/**
 * Generate an access token (short-lived)
 * @param payload - User data to encode
 * @returns Access token with 15-minute expiration
 */
export const generateAccessToken = (payload: object): string => {
  return generateToken(payload, '15m');
};

/**
 * Generate a refresh token (long-lived)
 * @param payload - User ID to encode
 * @returns Refresh token with 7-day expiration
 */
export const generateRefreshToken = (payload: object): string => {
  return generateToken(payload, '7d');
};

/**
 * Verify and decode a JWT token
 * @param token - JWT token string to verify
 * @returns Decoded token payload
 */
export const verifyToken = (token: string): string | jwt.JwtPayload => {
  try {
    return jwt.verify(token, config.JWT_SECRET);
  } catch (error) {
    const err = error as Error;
    logger.error('Token verification error:', err);

    if (err.name === 'TokenExpiredError') {
      throw new HttpException(401, 'Token has expired');
    }
    if (err.name === 'JsonWebTokenError') {
      throw new HttpException(401, 'Invalid token');
    }
    throw new HttpException(500, `Token verification error: ${err.message}`);
  }
};
