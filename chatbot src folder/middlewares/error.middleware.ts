import { NextFunction, Request, Response } from 'express';
import HttpException from '../exceptions/HttpException';
import { logger } from '../utils/logger';
import { ResponseUtil } from '../utils/response.util';

const errorMiddleware = (error: HttpException, req: Request, res: Response, next: NextFunction) => {
  try {
    const status: number = error.status || 500;
    const message: string = error.message || 'Something went wrong';
    
    // Log error details
    logger.error(`StatusCode : ${status}, Message : ${message}`, {
      method: req.method,
      url: req.url,
      userAgent: req.get('User-Agent'),
      stack: error.stack,
    });

    // Determine error code based on status
    let errorCode: string | undefined;
    switch (status) {
      case 400:
        errorCode = 'BAD_REQUEST';
        break;
      case 401:
        errorCode = 'UNAUTHORIZED';
        break;
      case 403:
        errorCode = 'FORBIDDEN';
        break;
      case 404:
        errorCode = 'NOT_FOUND';
        break;
      case 409:
        errorCode = 'CONFLICT';
        break;
      case 422:
        errorCode = 'VALIDATION_ERROR';
        break;
      case 500:
        errorCode = 'INTERNAL_SERVER_ERROR';
        break;
    }

    // Create standardized error response
    const errorResponse = ResponseUtil.error(
      message,
      errorCode,
      process.env.NODE_ENV === 'development' ? { stack: error.stack } : undefined
    );

    res.status(status).json(errorResponse);
  } catch (error) {
    next(error);
  }
};

export default errorMiddleware;
