/**
 * Authentication Middleware
 * Verifies JWT tokens and attaches user info to request
 */

import { Request, Response, NextFunction } from 'express';
import { UnauthorizedError } from '../utils/errors';
import { verifyAccessToken } from '../utils/jwt';

/**
 * Middleware to authenticate user using Bearer token
 */
export function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedError('No token provided');
    }

    // Check Bearer format
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      throw new UnauthorizedError('Invalid token format. Use: Bearer <token>');
    }

    const token = parts[1];

    // Verify token and extract payload
    const payload = verifyAccessToken(token);

    // Attach user info to request
    req.user = {
      id: payload.userId,
      email: payload.email,
      role: payload.role,
    };

    next();
  } catch (error) {
    next(error);
  }
}
