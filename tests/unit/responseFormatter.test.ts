/**
 * Unit tests for ResponseFormatter utility
 */

import { Response } from 'express';
import { ResponseFormatter } from '../../src/utils/responseFormatter';

describe('ResponseFormatter', () => {
  let mockRes: Partial<Response>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;
  let endMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    endMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock, end: endMock });
    mockRes = {
      status: statusMock,
      json: jsonMock,
      end: endMock,
    };
  });

  describe('success', () => {
    it('should send 200 status with success response structure', () => {
      const data = { id: 1, name: 'Test' };
      const message = 'Operation successful';

      ResponseFormatter.success(mockRes as Response, data, message);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data,
        message,
        meta: expect.objectContaining({
          timestamp: expect.any(String),
        }),
      });
    });

    it('should handle null data', () => {
      ResponseFormatter.success(mockRes as Response, null, 'No data');

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        message: 'No data',
        meta: expect.objectContaining({
          timestamp: expect.any(String),
        }),
      });
    });

    it('should handle arrays', () => {
      const data = [1, 2, 3];
      ResponseFormatter.success(mockRes as Response, data, 'Array data');

      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data,
        message: 'Array data',
        meta: expect.objectContaining({
          timestamp: expect.any(String),
        }),
      });
    });
  });

  describe('created', () => {
    it('should send 201 status with success response structure', () => {
      const data = { id: 1, name: 'New Resource' };
      const message = 'Resource created';

      ResponseFormatter.created(mockRes as Response, data, message);

      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data,
        message,
        meta: expect.objectContaining({
          timestamp: expect.any(String),
        }),
      });
    });

    it('should use default message when not provided', () => {
      const data = { id: 1 };

      ResponseFormatter.created(mockRes as Response, data);

      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data,
        })
      );
    });
  });

  describe('noContent', () => {
    it('should send 204 status with no response body', () => {
      ResponseFormatter.noContent(mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(204);
      expect(endMock).toHaveBeenCalled();
      expect(jsonMock).not.toHaveBeenCalled();
    });
  });

  describe('error', () => {
    it('should send custom status with error response structure', () => {
      const code = 'NOT_FOUND';
      const message = 'Not found';
      const status = 404;

      ResponseFormatter.error(mockRes as Response, code, message, status);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: {
          code,
          message,
          timestamp: expect.any(String),
        },
      });
    });

    it('should default to 500 status when not provided', () => {
      const code = 'INTERNAL_ERROR';
      const message = 'Internal error';

      ResponseFormatter.error(mockRes as Response, code, message);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: {
          code,
          message,
          timestamp: expect.any(String),
        },
      });
    });

    it('should include error details when provided', () => {
      const code = 'VALIDATION_ERROR';
      const message = 'Validation failed';
      const status = 400;
      const details = { field: 'email', issue: 'invalid format' };

      ResponseFormatter.error(mockRes as Response, code, message, status, details);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: {
          code,
          message,
          details,
          timestamp: expect.any(String),
        },
      });
    });
  });

  describe('paginated', () => {
    it('should send paginated response with metadata', () => {
      const data = [{ id: 1 }, { id: 2 }];
      const pagination = {
        page: 1,
        limit: 10,
        total: 100,
      };
      const message = 'Users retrieved';

      ResponseFormatter.paginated(mockRes as Response, data, pagination, message);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data,
        message,
        meta: expect.objectContaining({
          timestamp: expect.any(String),
          pagination,
        }),
      });
    });

    it('should handle empty data array', () => {
      const data: never[] = [];
      const pagination = {
        page: 1,
        limit: 10,
        total: 0,
      };

      ResponseFormatter.paginated(mockRes as Response, data, pagination, 'No results');

      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: [],
        message: 'No results',
        meta: expect.objectContaining({
          timestamp: expect.any(String),
          pagination,
        }),
      });
    });
  });
});
