/**
 * Validation Middleware
 * Validates request body/query/params using Zod schemas
 */

import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { BadRequestError } from '../utils/errors';

/**
 * Middleware factory to validate request body with Zod schema
 */
export function validateBody(schema: ZodSchema) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        // Let the error handler deal with ZodError
        next(error);
      } else {
        next(error);
      }
    }
  };
}

/**
 * Middleware factory to validate query parameters
 * Note: In Express 5.x, req.query is readonly, so we only validate without reassigning
 */
export function validateQuery(schema: ZodSchema) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate query params but don't reassign (req.query is readonly)
      await schema.parseAsync(req.query);
      next();
    } catch (error) {
      // Let the error handler deal with the error
      next(error);
    }
  };
}

/**
 * Middleware factory to validate route parameters
 */
export function validateParams(schema: ZodSchema) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      req.params = await schema.parseAsync(req.params);
      next();
    } catch (error) {
      // Let the error handler deal with the error
      next(error);
    }
  };
}
