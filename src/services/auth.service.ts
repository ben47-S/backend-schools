/**
 * Authentication Service
 * Business logic for authentication operations
 */

import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';
import { Role } from '../../generated/prisma/client';
import {
  ConflictError,
  NotFoundError,
  UnauthorizedError,
} from '../utils/errors';
import { generateTokens, verifyRefreshToken } from '../utils/jwt';
import type { RegisterInput, LoginInput, ChangePasswordInput } from '../schemas/auth.schemas';

/**
 * Register a new user
 */
export async function register(data: RegisterInput) {
  // Check if email already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: data.email },
  });

  if (existingUser) {
    throw new ConflictError('Email already registered');
  }

  // Hash password
  const passwordHash = await bcrypt.hash(data.password, 10);

  // Create user with role-specific data using transaction
  const result = await prisma.$transaction(async (tx) => {
    // Create base user
    const user = await tx.user.create({
      data: {
        email: data.email,
        passwordHash,
        role: data.role,
        photoUrl: data.photoUrl,
        isActive: true,
      },
    });

    // Create role-specific record
    switch (data.role) {
      case Role.ENSEIGNANT:
        // ENSEIGNANT records are created via /api/enseignants endpoint
        // because they require additional fields (datePriseFonction, indice)
        break;

      case Role.ETUDIANT:
        // ETUDIANT records are created via /api/etudiants endpoint
        // because they require additional fields (dateNaissance, gender, anneeEntree)
        break;

      case Role.PARENT:
        // PARENT records are created via /api/parents endpoint
        // for consistency with ENSEIGNANT and ETUDIANT
        break;

      case Role.ADMIN_COLLEGE:
        if (!data.collegeId) {
          throw new ConflictError('College ID required for ADMIN_COLLEGE role');
        }
        await tx.adminCollege.create({
          data: {
            userId: user.id,
            collegeId: data.collegeId,
          },
        });
        break;

      case Role.ADMIN_GLOBAL:
        // No additional record needed
        break;
    }

    return user;
  });

  // Return user without password
  const { passwordHash: _, ...userWithoutPassword } = result;
  return userWithoutPassword;
}

/**
 * Login user
 */
export async function login(data: LoginInput) {
  // Find user by email
  const user = await prisma.user.findUnique({
    where: { email: data.email },
  });

  if (!user) {
    throw new UnauthorizedError('Invalid credentials');
  }

  // Check if user is active
  if (!user.isActive) {
    throw new UnauthorizedError('Account is disabled');
  }

  // Verify password
  const isPasswordValid = await bcrypt.compare(data.password, user.passwordHash);

  if (!isPasswordValid) {
    throw new UnauthorizedError('Invalid credentials');
  }

  // Generate tokens
  const tokens = generateTokens(user.id, user.email, user.role);

  // Return user without password and tokens
  const { passwordHash: _, ...userWithoutPassword } = user;

  return {
    user: userWithoutPassword,
    tokens,
  };
}

/**
 * Refresh access token
 */
export async function refreshAccessToken(refreshToken: string) {
  // Verify refresh token
  const payload = verifyRefreshToken(refreshToken);

  // Get user from database
  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
  });

  if (!user) {
    throw new UnauthorizedError('User not found');
  }

  if (!user.isActive) {
    throw new UnauthorizedError('Account is disabled');
  }

  // Generate new tokens
  const tokens = generateTokens(user.id, user.email, user.role);

  return tokens;
}

/**
 * Change user password
 */
export async function changePassword(
  userId: string,
  data: ChangePasswordInput
) {
  // Get user
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new NotFoundError('User not found');
  }

  // Verify old password
  const isOldPasswordValid = await bcrypt.compare(
    data.oldPassword,
    user.passwordHash
  );

  if (!isOldPasswordValid) {
    throw new UnauthorizedError('Invalid old password');
  }

  // Hash new password
  const newPasswordHash = await bcrypt.hash(data.newPassword, 10);

  // Update password
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: newPasswordHash },
  });

  return { message: 'Password changed successfully' };
}

/**
 * Get user profile with role-specific data
 */
export async function getUserProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      enseignant: true,
      etudiant: true,
      parent: true,
      adminCollege: {
        include: {
          college: true,
        },
      },
    },
  });

  if (!user) {
    throw new NotFoundError('User not found');
  }

  // Return user without password
  const { passwordHash: _, ...userWithoutPassword } = user;
  return userWithoutPassword;
}
