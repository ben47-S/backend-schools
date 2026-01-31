/**
 * Express Type Extensions
 * Extends Express Request interface to include user data
 */

import { Role } from '../../generated/prisma/client';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: Role;
      };
    }
  }
}

export {};
