import HttpException, {
  ValidationException,
  AuthenticationException,
  AuthorizationException,
  NotFoundError,
  ConflictError,
} from '../../src/utils/httpException';

describe('HttpException', () => {
  it('should create basic exception', () => {
    const exception = new HttpException(400, 'Bad Request');

    expect(exception.status).toBe(400);
    expect(exception.message).toBe('Bad Request');
    expect(exception.code).toBe('BAD_REQUEST');
  });

  it('should create exception with custom code', () => {
    const exception = new HttpException(400, 'Custom error', 'CUSTOM');

    expect(exception.code).toBe('CUSTOM');
  });

  it('should map status codes correctly', () => {
    const cases = [
      [400, 'BAD_REQUEST'],
      [401, 'UNAUTHORIZED'],
      [404, 'NOT_FOUND'],
      [500, 'INTERNAL_SERVER_ERROR'],
    ];

    cases.forEach(([status, expectedCode]) => {
      const exception = new HttpException(status as number, 'Test');
      expect(exception.code).toBe(expectedCode);
    });
  });

  it('should create ValidationException', () => {
    const exception = new ValidationException('Email required');

    expect(exception.status).toBe(400);
    expect(exception.message).toBe('Email required');
    expect(exception.code).toBe('VALIDATION_ERROR');
  });

  it('should create AuthenticationException', () => {
    const exception = new AuthenticationException('Invalid token');

    expect(exception.status).toBe(401);
    expect(exception.message).toBe('Invalid token');
    expect(exception.code).toBe('AUTHENTICATION_ERROR');
  });

  it('should create AuthorizationException', () => {
    const exception = new AuthorizationException('Access denied');

    expect(exception.status).toBe(403);
    expect(exception.message).toBe('Access denied');
  });

  it('should create NotFoundError', () => {
    const exception = new NotFoundError('User');

    expect(exception.status).toBe(404);
    expect(exception.message).toBe('User not found');
  });

  it('should create ConflictError', () => {
    const exception = new ConflictError('Email exists');

    expect(exception.status).toBe(409);
    expect(exception.message).toBe('Email exists');
  });
});
