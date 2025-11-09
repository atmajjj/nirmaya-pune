/**
 * Enhanced HTTP Exception with error codes
 * Provides structured error handling with status codes and custom error codes
 */
class HttpException extends Error {
  public status: number;
  public message: string;
  public code: string;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.status = status;
    this.message = message;
    this.code = code || this.getDefaultCode(status);
  }

  private getDefaultCode(status: number): string {
    switch (status) {
      case 400:
        return 'BAD_REQUEST';
      case 401:
        return 'UNAUTHORIZED';
      case 403:
        return 'FORBIDDEN';
      case 404:
        return 'NOT_FOUND';
      case 409:
        return 'CONFLICT';
      case 429:
        return 'TOO_MANY_REQUESTS';
      case 500:
        return 'INTERNAL_SERVER_ERROR';
      default:
        return 'UNKNOWN_ERROR';
    }
  }
}

export default HttpException;

/**
 * Validation error for invalid request data
 */
export class ValidationException extends HttpException {
  constructor(message: string = 'Validation failed') {
    super(400, message, 'VALIDATION_ERROR');
  }
}

/**
 * Authentication error for missing or invalid credentials
 */
export class AuthenticationException extends HttpException {
  constructor(message: string = 'Authentication required') {
    super(401, message, 'AUTHENTICATION_ERROR');
  }
}

/**
 * Authorization error for insufficient permissions
 */
export class AuthorizationException extends HttpException {
  constructor(message: string = 'Access denied') {
    super(403, message, 'AUTHORIZATION_ERROR');
  }
}

/**
 * Resource not found error
 */
export class NotFoundError extends HttpException {
  constructor(resource: string = 'Resource') {
    super(404, `${resource} not found`, 'NOT_FOUND');
  }
}

/**
 * Resource conflict error for duplicate resources
 */
export class ConflictError extends HttpException {
  constructor(message: string = 'Resource conflict') {
    super(409, message, 'CONFLICT');
  }
}
