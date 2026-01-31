/**
 * JWT Utilities
 * Handles token generation and verification
 */

import jwt from 'jsonwebtoken';
import { Role } from '../../generated/prisma/client';
import { env } from '../config/env';
import { UnauthorizedError } from './errors';

export interface JwtPayload {
  userId: string;
  email: string;
  role: Role;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

/**
 * Generate access token (short-lived)
 */
export function generateAccessToken(userId: string, email: string, role: Role): string {
  const payload: JwtPayload = {
    userId,
    email,
    role,
  };

  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  });
}

/**
 * Generate refresh token (long-lived)
 */
export function generateRefreshToken(userId: string): string {
  return jwt.sign({ userId }, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN,
  });
}

/**
 * Generate both access and refresh tokens
 */
export function generateTokens(userId: string, email: string, role: Role): AuthTokens {
  return {
    accessToken: generateAccessToken(userId, email, role),
    refreshToken: generateRefreshToken(userId),
  };
}

/**
 * Verify access token
 */
export function verifyAccessToken(token: string): JwtPayload {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new UnauthorizedError('Token expired');
    }
    throw new UnauthorizedError('Invalid token');
  }
}

/**
 * Verify refresh token
 */
export function verifyRefreshToken(token: string): { userId: string } {
  try {
    const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET) as { userId: string };
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new UnauthorizedError('Refresh token expired');
    }
    throw new UnauthorizedError('Invalid refresh token');
  }
}

/**
 * Extract user info from token without verification (for debugging)
 */
export function decodeToken(token: string): JwtPayload | null {
  try {
    return jwt.decode(token) as JwtPayload;
  } catch {
    return null;
  }
}
