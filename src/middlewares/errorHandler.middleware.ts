/**
 * Global Error Handler Middleware
 * Catches and formats all errors in a standardized way
 */

import { Request, Response, NextFunction } from 'express';
import { Prisma } from '../../generated/prisma/client';
import { ZodError } from 'zod';
import { AppError } from '../utils/errors';
import { env } from '../config/env';

/**
 * Global error handling middleware
 * Must be registered last in the middleware chain
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Log error in development
  if (env.NODE_ENV === 'development') {
    console.error('❌ Error:', err);
  }

  // Handle custom AppError instances
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        message: err.message,
        code: err.constructor.name,
        ...((err as any).details && { details: (err as any).details }),
      },
    });
    return;
  }

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const details = err.errors?.map((error) => ({
      field: error.path?.join('.') || 'unknown',
      message: error.message,
    })) || [];

    res.status(400).json({
      success: false,
      error: {
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details,
      },
    });
    return;
  }

  // Handle Prisma errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // Unique constraint violation
    if (err.code === 'P2002') {
      const target = (err.meta?.target as string[]) || [];
      res.status(409).json({
        success: false,
        error: {
          message: `Resource already exists. Duplicate field: ${target.join(', ')}`,
          code: 'DUPLICATE_RESOURCE',
          details: { fields: target },
        },
      });
      return;
    }

    // Record not found
    if (err.code === 'P2025') {
      res.status(404).json({
        success: false,
        error: {
          message: 'Resource not found',
          code: 'NOT_FOUND',
        },
      });
      return;
    }

    // Foreign key constraint violation
    if (err.code === 'P2003') {
      res.status(400).json({
        success: false,
        error: {
          message: 'Invalid reference. Related resource does not exist',
          code: 'INVALID_REFERENCE',
        },
      });
      return;
    }
  }

  // Handle Prisma validation errors
  if (err instanceof Prisma.PrismaClientValidationError) {
    res.status(400).json({
      success: false,
      error: {
        message: 'Database validation failed',
        code: 'DB_VALIDATION_ERROR',
      },
    });
    return;
  }

  // Generic server error (fallback)
  res.status(500).json({
    success: false,
    error: {
      message: env.NODE_ENV === 'development' ? err.message : 'Internal server error',
      code: 'INTERNAL_SERVER_ERROR',
      ...(env.NODE_ENV === 'development' && { stack: err.stack }),
    },
  });
}
