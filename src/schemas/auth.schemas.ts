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
 * Base register schema (common fields without role)
 */
const baseRegisterFields = {
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  nom: z.string().min(1, 'Nom is required'),
  prenom: z.string().min(1, 'Prenom is required'),
  telephone: z.string().optional(),
  photoUrl: z.string().url().optional().nullable(),
};

/**
 * Register schema with role-specific validations
 */
export const registerSchema = z.discriminatedUnion('role', [
  // ADMIN_GLOBAL - no extra fields
  z.object({
    ...baseRegisterFields,
    role: z.literal('ADMIN_GLOBAL'),
  }),

  // ADMIN_COLLEGE - REMOVED FOR SECURITY
  // ADMIN_COLLEGE users must be created by ADMIN_GLOBAL when creating a college
  // See college.schemas.ts for createCollegeWithAdminSchema

  // ENSEIGNANT - no extra fields (profile created via /api/enseignants)
  z.object({
    ...baseRegisterFields,
    role: z.literal('ENSEIGNANT'),
  }),

  // ETUDIANT - self-registration enabled
  // Students create their account and then submit enrollment requests to colleges
  z.object({
    ...baseRegisterFields,
    role: z.literal('ETUDIANT'),
    anneeEntree: z
      .number()
      .int('Year must be an integer')
      .min(1900, 'Year must be after 1900')
      .max(new Date().getFullYear(), 'Year cannot be in the future'),
  }),

  // PARENT - no extra required fields
  z.object({
    ...baseRegisterFields,
    role: z.literal('PARENT'),
  }),
]);

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

/**
 * Student registration schema (dedicated endpoint)
 * Simplified for student self-registration
 */
export const registerEtudiantSchema = z.object({
  email: z.string().email('Format email invalide'),
  password: z.string().min(6, 'Mot de passe minimum 6 caractères'),
  nom: z.string().min(1, 'Nom requis'),
  prenom: z.string().min(1, 'Prénom requis'),
  telephone: z.string().optional(),
});

export type RegisterEtudiantInput = z.infer<typeof registerEtudiantSchema>;

/**
 * Teacher registration schema (dedicated endpoint)
 * Simplified for teacher self-registration
 */
export const registerEnseignantSchema = z.object({
  email: z.string().email('Format email invalide'),
  password: z.string().min(6, 'Mot de passe minimum 6 caractères'),
  nom: z.string().min(1, 'Nom requis'),
  prenom: z.string().min(1, 'Prénom requis'),
  telephone: z.string().optional(),
  specialite: z.string().optional(),
});

export type RegisterEnseignantInput = z.infer<typeof registerEnseignantSchema>;
