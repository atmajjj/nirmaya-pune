/**
 * HTTP Exception with error codes
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
