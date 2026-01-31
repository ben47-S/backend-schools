/**
 * Common Types
 * Shared type definitions used across the application
 */

import { Role } from '../../generated/prisma/client';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
    details?: any;
  };
  message?: string;
}

export interface PaginationParams {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface JwtPayload {
  userId: string;
  email: string;
  role: Role;
}

export interface UserProfile {
  id: string;
  email: string;
  role: Role;
  photoUrl?: string | null;
  isActive: boolean;
}

// Re-export Role for convenience
export { Role } from '../../generated/prisma/client';
