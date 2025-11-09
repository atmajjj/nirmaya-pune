import { generateToken, verifyToken } from '../../../../utils/jwt';
import HttpException from '../../../../utils/httpException';

describe('JWT Utils', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'test-jwt-secret';
  });

  describe('generateToken', () => {
    it('should generate a valid token', () => {
      const payload = { id: 1, email: 'test@example.com' };
      const token = generateToken(payload);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3); // JWT format: header.payload.signature
    });

    it('should generate token with custom expiry', () => {
      const payload = { id: 1, email: 'test@example.com' };
      const token = generateToken(payload, '2h');

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
    });

    it('should handle invalid payload', () => {
      const circularPayload: Record<string, unknown> = {};
      circularPayload.self = circularPayload;

      expect(() => generateToken(circularPayload)).toThrow(HttpException);
    });
  });

  describe('verifyToken', () => {
    it('should verify valid token', () => {
      const payload = { id: 1, email: 'test@example.com' };
      const token = generateToken(payload);
      const decoded = verifyToken(token) as { id: number; email: string };

      expect(decoded.id).toBe(1);
      expect(decoded.email).toBe('test@example.com');
    });

    it('should reject invalid token', () => {
      expect(() => verifyToken('invalid.token')).toThrow(HttpException);
    });

    it('should reject malformed token', () => {
      expect(() => verifyToken('malformed')).toThrow(HttpException);
    });
  });
});
