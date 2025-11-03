import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';
import * as Sentry from '@sentry/node';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  const requestId = req.headers['x-request-id'] || 'unknown';
  
  logger.error('Request error', {
    error: err.message,
    stack: err.stack,
    requestId,
    path: req.path,
    method: req.method,
  });

  Sentry.captureException(err, {
    extra: {
      requestId,
      path: req.path,
      method: req.method,
    },
  });

  const statusCode = err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production' 
    ? 'An error occurred' 
    : err.message;

  res.status(statusCode).json({
    error: err.name || 'Error',
    message,
    status_code: statusCode,
  });
};
