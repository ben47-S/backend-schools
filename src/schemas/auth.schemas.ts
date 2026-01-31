/**
 * Authentication Validation Schemas
 * Zod schemas for auth-related requests
 */

import { z } from 'zod';
import { Role } from '../../generated/prisma/client';

/**
 * Login schema
 */
export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export type LoginInput = z.infer<typeof loginSchema>;

/**
 * Base register schema (common fields)
 */
const baseRegisterSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.nativeEnum(Role, { errorMap: () => ({ message: 'Invalid role' }) }),
  nom: z.string().min(1, 'Nom is required'),
  prenom: z.string().min(1, 'Prenom is required'),
  telephone: z.string().optional(),
  photoUrl: z.string().url().optional().nullable(),
});

/**
 * Register schema with role-specific validations
 */
export const registerSchema = baseRegisterSchema.and(
  z.discriminatedUnion('role', [
    // ADMIN_GLOBAL - no extra fields
    z.object({
      role: z.literal(Role.ADMIN_GLOBAL),
    }),

    // ADMIN_COLLEGE - requires collegeId
    z.object({
      role: z.literal(Role.ADMIN_COLLEGE),
      collegeId: z.string().uuid('Invalid college ID'),
    }),

    // ENSEIGNANT - no extra fields (profile created via /api/enseignants)
    z.object({
      role: z.literal(Role.ENSEIGNANT),
    }),

    // ETUDIANT - no extra fields (profile created via /api/etudiants)
    z.object({
      role: z.literal(Role.ETUDIANT),
    }),

    // PARENT - no extra required fields
    z.object({
      role: z.literal(Role.PARENT),
    }),
  ])
);

export type RegisterInput = z.infer<typeof registerSchema>;

/**
 * Refresh token schema
 */
export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;

/**
 * Change password schema
 */
export const changePasswordSchema = z.object({
  oldPassword: z.string().min(1, 'Old password is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters'),
});

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
