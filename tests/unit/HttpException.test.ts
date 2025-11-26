import HttpException from '../../src/utils/httpException';

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
      [403, 'FORBIDDEN'],
      [404, 'NOT_FOUND'],
      [409, 'CONFLICT'],
      [429, 'TOO_MANY_REQUESTS'],
      [500, 'INTERNAL_SERVER_ERROR'],
      [418, 'UNKNOWN_ERROR'], // Unknown status code
    ];

    cases.forEach(([status, expectedCode]) => {
      const exception = new HttpException(status as number, 'Test');
      expect(exception.code).toBe(expectedCode);
    });
  });
});
