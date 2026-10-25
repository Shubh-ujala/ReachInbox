import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

/**
 * Centralised error-handling middleware.
 * Must have exactly 4 parameters so Express recognises it as an error handler.
 */
export function errorMiddleware(
  err: AppError,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  const statusCode = err.statusCode ?? 500;
  const isProduction = process.env.NODE_ENV === 'production';

  logger.error('Unhandled error', {
    message: err.message,
    statusCode,
    stack: isProduction ? undefined : err.stack,
  });

  res.status(statusCode).json({
    success: false,
    error: err.isOperational === false && isProduction
      ? 'Internal server error'
      : err.message || 'Internal server error',
    // Never send stack traces to clients in production
    ...(isProduction ? {} : { stack: err.stack }),
  });
}

/** 404 handler for unmatched routes */
export function notFoundMiddleware(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: `Route ${req.method} ${req.path} not found`,
  });
}
