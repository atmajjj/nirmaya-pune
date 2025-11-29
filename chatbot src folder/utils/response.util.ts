/**
 * Standardized API Response Utility
 * Provides consistent response formats across all controllers
 */

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    timestamp?: string;
    [key: string]: any;
  };
}

export interface ApiError {
  success: false;
  message: string;
  error?: string;
  details?: any;
  timestamp?: string;
}

/**
 * Response utility class for consistent API responses
 */
export class ResponseUtil {
  /**
   * Create a successful response
   * @param message Success message
   * @param data Optional data payload
   * @param meta Optional metadata (pagination, etc.)
   */
  static success<T>(
    message: string,
    data?: T,
    meta?: ApiResponse<T>['meta']
  ): ApiResponse<T> {
    const response: ApiResponse<T> = {
      success: true,
      message,
    };

    if (data !== undefined) {
      response.data = data;
    }

    if (meta) {
      response.meta = {
        ...meta,
        timestamp: new Date().toISOString(),
      };
    }

    return response;
  }

  /**
   * Create an error response
   * @param message Error message
   * @param error Optional error code
   * @param details Optional error details
   */
  static error(
    message: string,
    error?: string,
    details?: any
  ): ApiError {
    return {
      success: false,
      message,
      timestamp: new Date().toISOString(),
      ...(error && { error }),
      ...(details && { details }),
    };
  }

  /**
   * Create a paginated response
   * @param message Success message
   * @param data Data array
   * @param page Current page
   * @param limit Items per page
   * @param total Total items
   */
  static paginated<T>(
    message: string,
    data: T[],
    page: number,
    limit: number,
    total: number
  ): ApiResponse<T[]> {
    return this.success(message, data, {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    });
  }

  /**
   * Create a response with only a message (no data)
   * @param message Success message
   */
  static message(message: string): ApiResponse {
    return this.success(message);
  }

  /**
   * Create a response for created resources
   * @param message Success message
   * @param data Created resource data
   */
  static created<T>(message: string, data: T): ApiResponse<T> {
    return this.success(message, data);
  }

  /**
   * Create a response for updated resources
   * @param message Success message
   * @param data Updated resource data
   */
  static updated<T>(message: string, data?: T): ApiResponse<T> {
    return this.success(message, data);
  }

  /**
   * Create a response for deleted resources
   * @param message Success message
   */
  static deleted(message: string): ApiResponse {
    return this.success(message);
  }
}

// Export default for convenience
export default ResponseUtil;