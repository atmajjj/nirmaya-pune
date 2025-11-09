import { Request, Response, NextFunction } from 'express';
import { requireAuth } from '../../src/middlewares/auth.middleware';
import { verifyToken } from '../../src/utils/jwt';
import HttpException from '../../src/utils/httpException';
import { RequestWithUser } from '../../src/interfaces/request.interface';

jest.mock('../../src/utils/jwt');

describe('Auth Middleware', () => {
  let mockRequest: Partial<RequestWithUser>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;
  const mockVerifyToken = verifyToken as jest.MockedFunction<typeof verifyToken>;

  beforeEach(() => {
    mockRequest = {
      headers: {},
    };
    mockResponse = {};
    nextFunction = jest.fn();
    jest.clearAllMocks();
  });

  describe('requireAuth', () => {
    it('should successfully authenticate with valid token', async () => {
      const mockDecoded = {
        id: 1,
        role: 'user' as const,
      };
      mockRequest.headers = {
        authorization: 'Bearer valid.jwt.token',
      };
      mockVerifyToken.mockReturnValue(mockDecoded);

      await requireAuth(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockVerifyToken).toHaveBeenCalledWith('valid.jwt.token');
      expect(mockRequest.userId).toBe(mockDecoded.id);
      expect(mockRequest.userRole).toBe(mockDecoded.role);
      expect(nextFunction).toHaveBeenCalledWith();
    });

    it('should throw 401 error if no authorization header', async () => {
      mockRequest.headers = {};

      await requireAuth(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledWith(expect.any(HttpException));
      const error = (nextFunction as jest.Mock).mock.calls[0][0];
      expect(error.status).toBe(401);
      expect(error.message).toBe('Authentication required. No token provided.');
      expect(mockVerifyToken).not.toHaveBeenCalled();
    });

    it('should throw 401 error if authorization header does not start with Bearer', async () => {
      mockRequest.headers = {
        authorization: 'Basic dXNlcjpwYXNz',
      };

      await requireAuth(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledWith(expect.any(HttpException));
      const error = (nextFunction as jest.Mock).mock.calls[0][0];
      expect(error.status).toBe(401);
      expect(error.message).toBe('Authentication required. No token provided.');
      expect(mockVerifyToken).not.toHaveBeenCalled();
    });

    it('should throw 401 error if token is null string', async () => {
      mockRequest.headers = {
        authorization: 'Bearer null',
      };

      await requireAuth(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledWith(expect.any(HttpException));
      const error = (nextFunction as jest.Mock).mock.calls[0][0];
      expect(error.status).toBe(401);
      expect(error.message).toBe('Authentication required. No token provided.');
      expect(mockVerifyToken).not.toHaveBeenCalled();
    });

    it('should throw 401 error if token verification fails', async () => {
      mockRequest.headers = {
        authorization: 'Bearer invalid.token',
      };
      mockVerifyToken.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await requireAuth(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledWith(expect.any(HttpException));
      const error = (nextFunction as jest.Mock).mock.calls[0][0];
      expect(error.status).toBe(401);
      expect(error.message).toBe('Authentication failed');
    });

    it('should throw 401 error if decoded token is a string', async () => {
      mockRequest.headers = {
        authorization: 'Bearer valid.token',
      };
      mockVerifyToken.mockReturnValue('string-token');

      await requireAuth(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledWith(expect.any(HttpException));
      const error = (nextFunction as jest.Mock).mock.calls[0][0];
      expect(error.status).toBe(401);
      expect(error.message).toBe('Invalid token payload');
    });

    it('should throw 401 error if decoded token is missing required fields', async () => {
      mockRequest.headers = {
        authorization: 'Bearer valid.token',
      };
      mockVerifyToken.mockReturnValue({ id: 1 } as any); // Missing role

      await requireAuth(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledWith(expect.any(HttpException));
      const error = (nextFunction as jest.Mock).mock.calls[0][0];
      expect(error.status).toBe(401);
      expect(error.message).toBe('Invalid token payload');
    });

    it('should pass HttpException through if verifyToken throws one', async () => {
      mockRequest.headers = {
        authorization: 'Bearer expired.token',
      };
      const httpException = new HttpException(401, 'Token expired');
      mockVerifyToken.mockImplementation(() => {
        throw httpException;
      });

      await requireAuth(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledWith(httpException);
    });
  });
});
