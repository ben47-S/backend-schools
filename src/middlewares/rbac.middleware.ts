/**
 * Role-Based Access Control (RBAC) Middleware
 * Restricts access based on user roles
 */

import { Request, Response, NextFunction } from 'express';
import { Role } from '../../generated/prisma/client';
import { ForbiddenError, UnauthorizedError } from '../utils/errors';

/**
 * Middleware factory to check if user has required role(s)
 */
export function requireRoles(...allowedRoles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Check if user is authenticated
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      // Check if user has one of the allowed roles
      if (!allowedRoles.includes(req.user.role)) {
        throw new ForbiddenError(
          `Insufficient permissions. Required roles: ${allowedRoles.join(', ')}`
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Shorthand middleware for admin-only routes (ADMIN_GLOBAL or ADMIN_COLLEGE)
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  return requireRoles('ADMIN_GLOBAL', 'ADMIN_COLLEGE')(req, res, next);
}

/**
 * Shorthand middleware for ADMIN_GLOBAL only
 */
export function requireGlobalAdmin(req: Request, res: Response, next: NextFunction): void {
  return requireRoles('ADMIN_GLOBAL')(req, res, next);
}
