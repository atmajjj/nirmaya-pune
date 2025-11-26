import { Response } from 'express';

interface SuccessResponse<T = unknown> {
  success: true;
  data?: T;
  message: string;
  meta?: {
    timestamp: string;
    requestId?: string;
    pagination?: {
      page: number;
      limit: number;
      total: number;
    };
  };
}

interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    requestId?: string;
    timestamp: string;
  };
}

export class ResponseFormatter {
  /**
   * Send a successful response
   */
  static success<T = unknown>(
    res: Response,
    data: T | null = null,
    message: string = 'Operation successful',
    statusCode: number = 200,
    meta?: SuccessResponse<T>['meta']
  ): Response<SuccessResponse<T>> {
    const response: SuccessResponse<T> = {
      success: true,
      message,
      meta: {
        timestamp: new Date().toISOString(),
        ...meta,
      },
    };

    // Only include data if it's provided
    if (data !== null) {
      response.data = data;
    }

    return res.status(statusCode).json(response);
  }

  /**
   * Send a successful response for creation
   */
  static created<T = unknown>(
    res: Response,
    data: T,
    message: string = 'Resource created successfully'
  ): Response<SuccessResponse<T>> {
    return this.success(res, data, message, 201);
  }

  /**
   * Send a successful response with no content
   * Note: HTTP 204 must have no response body per RFC 7231
   */
  static noContent(res: Response): Response {
    return res.status(204).end();
  }

  /**
   * Send a paginated response
   */
  static paginated<T = unknown>(
    res: Response,
    data: T[],
    pagination: { page: number; limit: number; total: number },
    message: string = 'Data retrieved successfully'
  ): Response<SuccessResponse<T[]>> {
    return this.success(res, data, message, 200, {
      timestamp: new Date().toISOString(),
      pagination,
    });
  }

  /**
   * Send an error response (this should be handled by error middleware)
   * This is just for reference
   */
  static error(
    res: Response,
    code: string,
    message: string,
    statusCode: number = 500,
    details?: Record<string, unknown>
  ): Response<ErrorResponse> {
    return res.status(statusCode).json({
      success: false,
      error: {
        code,
        message,
        details,
        timestamp: new Date().toISOString(),
      },
    });
  }
}
