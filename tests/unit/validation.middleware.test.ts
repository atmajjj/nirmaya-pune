import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import validationMiddleware from '../../src/middlewares/validation.middleware';
import HttpException from '../../src/utils/httpException';

describe('Validation Middleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    req = {};
    res = {};
    next = jest.fn();
  });

  it('should validate body data', () => {
    const schema = z.object({ name: z.string(), age: z.number() });
    req.body = { name: 'John', age: 25 };

    const middleware = validationMiddleware(schema, 'body');
    middleware(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('should reject invalid body data', () => {
    const schema = z.object({ name: z.string(), age: z.number() });
    req.body = { name: 'John', age: 'invalid' };

    const middleware = validationMiddleware(schema, 'body');
    middleware(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledWith(expect.any(HttpException));
  });

  it('should validate query parameters', () => {
    const schema = z.object({ page: z.string().transform(Number) });
    req.query = { page: '1' };

    const middleware = validationMiddleware(schema, 'query');
    middleware(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.query).toEqual({ page: 1 });
  });

  it('should validate URL params', () => {
    const schema = z.object({ id: z.string().uuid() });
    req.params = { id: '123e4567-e89b-12d3-a456-426614174000' };

    const middleware = validationMiddleware(schema, 'params');
    middleware(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('should reject invalid UUID', () => {
    const schema = z.object({ id: z.string().uuid() });
    req.params = { id: 'invalid-uuid' };

    const middleware = validationMiddleware(schema, 'params');
    middleware(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledWith(expect.any(HttpException));
  });

  it('should default to body validation', () => {
    const schema = z.object({ test: z.string() });
    req.body = { test: 'value' };

    const middleware = validationMiddleware(schema);
    middleware(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('should handle missing data gracefully', () => {
    const schema = z.object({ data: z.string() });
    req.body = undefined;

    const middleware = validationMiddleware(schema, 'body');
    middleware(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledWith(expect.any(HttpException));
  });
});
