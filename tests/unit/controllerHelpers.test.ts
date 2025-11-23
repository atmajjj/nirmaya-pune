/**
 * Unit tests for controller helper utilities
 */

import { Request, Response, NextFunction } from 'express';
import { parseIdParam, getUserId, asyncHandler } from '../../src/utils/controllerHelpers';
import HttpException from '../../src/utils/httpException';

describe('Controller Helpers', () => {
  describe('parseIdParam', () => {
    it('should parse valid numeric ID from request params', () => {
      const req = { params: { id: '123' } } as unknown as Request;
      const result = parseIdParam(req);
      expect(result).toBe(123);
    });

    it('should parse valid ID with custom param name', () => {
      const req = { params: { userId: '456' } } as unknown as Request;
      const result = parseIdParam(req, 'userId');
      expect(result).toBe(456);
    });

    it('should throw HttpException for non-numeric ID', () => {
      const req = { params: { id: 'abc' } } as unknown as Request;
      expect(() => parseIdParam(req)).toThrow(HttpException);
      expect(() => parseIdParam(req)).toThrow('Invalid id parameter');
    });

    it('should throw HttpException for negative ID', () => {
      const req = { params: { id: '-5' } } as unknown as Request;
      expect(() => parseIdParam(req)).toThrow(HttpException);
      expect(() => parseIdParam(req)).toThrow('Invalid id parameter');
    });

    it('should throw HttpException for zero ID', () => {
      const req = { params: { id: '0' } } as unknown as Request;
      expect(() => parseIdParam(req)).toThrow(HttpException);
    });

    it('should throw HttpException for missing ID param', () => {
      const req = { params: {} } as unknown as Request;
      expect(() => parseIdParam(req)).toThrow(HttpException);
    });

    it('should throw HttpException with custom param name in error message', () => {
      const req = { params: { customId: 'invalid' } } as unknown as Request;
      expect(() => parseIdParam(req, 'customId')).toThrow('Invalid customId parameter');
    });
  });

  describe('getUserId', () => {
    it('should return userId when present in request', () => {
      const req = { userId: 42 } as unknown as Request;
      const result = getUserId(req);
      expect(result).toBe(42);
    });

    it('should throw HttpException when userId is undefined', () => {
      const req = {} as unknown as Request;
      expect(() => getUserId(req)).toThrow(HttpException);
      expect(() => getUserId(req)).toThrow('User authentication required');
    });

    it('should throw 401 status code', () => {
      const req = {} as unknown as Request;
      try {
        getUserId(req);
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        expect((error as HttpException).status).toBe(401);
      }
    });
  });

  describe('asyncHandler', () => {
    it('should call the async function and pass control to next', async () => {
      const mockReq = {} as Request;
      const mockRes = {} as Response;
      const mockNext = jest.fn() as NextFunction;

      const asyncFn = jest.fn().mockResolvedValue(undefined);
      const handler = asyncHandler(asyncFn);

      await handler(mockReq, mockRes, mockNext);

      expect(asyncFn).toHaveBeenCalledWith(mockReq, mockRes, mockNext);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should catch errors and pass them to next middleware', async () => {
      const mockReq = {} as Request;
      const mockRes = {} as Response;
      const mockNext = jest.fn() as NextFunction;

      const error = new Error('Test error');
      const asyncFn = jest.fn().mockRejectedValue(error);
      const handler = asyncHandler(asyncFn);

      await handler(mockReq, mockRes, mockNext);

      expect(asyncFn).toHaveBeenCalledWith(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalledWith(error);
    });

    it('should handle HttpException errors', async () => {
      const mockReq = {} as Request;
      const mockRes = {} as Response;
      const mockNext = jest.fn() as NextFunction;

      const error = new HttpException(404, 'Not found');
      const asyncFn = jest.fn().mockRejectedValue(error);
      const handler = asyncHandler(asyncFn);

      await handler(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 404,
          message: 'Not found',
        })
      );
    });

    it('should handle synchronous errors thrown in async function', async () => {
      const mockReq = {} as Request;
      const mockRes = {} as Response;
      const mockNext = jest.fn() as NextFunction;

      const error = new Error('Sync error');
      // Mock a function that throws synchronously when called
      const asyncFn = jest.fn(async () => {
        throw error;
      });
      const handler = asyncHandler(asyncFn);

      await handler(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });
});
