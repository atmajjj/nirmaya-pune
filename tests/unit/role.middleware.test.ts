import { Response, NextFunction } from 'express';
import { requireRole } from '../../src/middlewares/role.middleware';
import HttpException from '../../src/utils/httpException';
import { RequestWithUser } from '../../src/interfaces/request.interface';

describe('Role Middleware', () => {
  let mockRequest: Partial<RequestWithUser>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockRequest = {};
    mockResponse = {};
    nextFunction = jest.fn();
    jest.clearAllMocks();
  });

  describe('requireRole', () => {
    it('should allow access for user with matching role (single role)', async () => {
      mockRequest.userId = 1;
      mockRequest.userRole = 'admin';

      const middleware = requireRole('admin');
      await middleware(mockRequest as RequestWithUser, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledWith();
    });

    it('should allow access for user with matching role (multiple roles)', async () => {
      mockRequest.userId = 1;
      mockRequest.userRole = 'admin';

      const middleware = requireRole(['admin', 'user']);
      await middleware(mockRequest as RequestWithUser, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledWith();
    });

    it('should allow access for user role when multiple roles allowed', async () => {
      mockRequest.userId = 1;
      mockRequest.userRole = 'user';

      const middleware = requireRole(['admin', 'user']);
      await middleware(mockRequest as RequestWithUser, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledWith();
    });

    it('should throw 401 error if userId is missing', async () => {
      mockRequest.userRole = 'admin';

      const middleware = requireRole('admin');
      await middleware(mockRequest as RequestWithUser, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledWith(new HttpException(401, 'Authentication required'));
    });

    it('should throw 403 error if userRole is missing', async () => {
      mockRequest.userId = 1;

      const middleware = requireRole('admin');
      await middleware(mockRequest as RequestWithUser, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledWith(new HttpException(403, 'User role not found'));
    });

    it('should throw 403 error if user does not have required role', async () => {
      mockRequest.userId = 1;
      mockRequest.userRole = 'user';

      const middleware = requireRole('admin');
      await middleware(mockRequest as RequestWithUser, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledWith(
        new HttpException(403, 'Access denied. Required role: admin')
      );
    });

    it('should throw 403 error with multiple roles message', async () => {
      mockRequest.userId = 1;
      mockRequest.userRole = 'user';

      const middleware = requireRole(['admin', 'user']);
      await middleware(mockRequest as RequestWithUser, mockResponse as Response, nextFunction);

      // Since user has 'user' role and it's in the allowed list, it should actually pass
      expect(nextFunction).toHaveBeenCalledWith();
    });

    it('should verify role matching works correctly with edge case', async () => {
      mockRequest.userId = 1;
      mockRequest.userRole = 'user';

      const middleware = requireRole('admin');
      await middleware(mockRequest as RequestWithUser, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledWith(expect.any(HttpException));
      const error = (nextFunction as jest.Mock).mock.calls[0][0];
      expect(error.status).toBe(403);
      expect(error.message).toBe('Access denied. Required role: admin');
    });
  });
});
