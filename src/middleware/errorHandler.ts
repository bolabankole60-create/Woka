/**
 * Error Handler Middleware
 *
 * Centralized error handling for Express
 * Catches all errors and returns consistent JSON response with proper HTTP status codes
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

// ============================================================================
// CUSTOM ERROR TYPES
// ============================================================================

export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public details?: any,
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, details);
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404);
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401);
    Object.setPrototypeOf(this, UnauthorizedError.prototype);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message, 403);
    Object.setPrototypeOf(this, ForbiddenError.prototype);
  }
}

// ============================================================================
// ERROR HANDLER MIDDLEWARE
// ============================================================================

/**
 * Global error handler middleware
 * Must be the last middleware in the Express app
 */
export function errorHandler(
  error: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  let statusCode = 500;
  let message = 'Internal server error';
  let details: any = undefined;

  // Handle custom app errors
  if (error instanceof AppError) {
    statusCode = error.statusCode;
    message = error.message;
    details = error.details;
  }

  // Handle Prisma errors
  if (error.constructor.name === 'PrismaClientKnownRequestError') {
    const prismaError = error as any;

    switch (prismaError.code) {
      case 'P2002': // Unique constraint violation
        statusCode = 409;
        message = 'Record already exists';
        details = {
          field: prismaError.meta?.target?.[0],
        };
        break;

      case 'P2025': // Record not found
        statusCode = 404;
        message = 'Record not found';
        break;

      case 'P2003': // Foreign key constraint violation
        statusCode = 400;
        message = 'Invalid reference to related record';
        break;

      default:
        statusCode = 400;
        message = 'Database error';
    }
  }

  // Log error
  if (statusCode >= 500) {
    logger.error(`${req.method} ${req.path}`, error);
  } else {
    logger.warn(`${req.method} ${req.path} - ${statusCode}: ${message}`);
  }

  // Send response
  res.status(statusCode).json({
    success: false,
    error: message,
    ...(details && { details }),
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
  });
}

/**
 * Async error wrapper for route handlers
 * Catches errors and passes them to error handler middleware
 *
 * Usage:
 * app.get('/route', asyncHandler(async (req, res) => {
 *   // Your async code
 * }));
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
