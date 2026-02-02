/**
 * Etudiant Validation Schemas
 * Zod schemas for student operations
 */

import { z } from 'zod';
import { Role } from '../../generated/prisma/client';

/**
 * Create user with profile schema (generic)
 * Creates user account and corresponding profile based on role
 */
export const createUserWithProfileSchema = z.discriminatedUnion('role', [
  // ETUDIANT
  z.object({
    role: z.literal('ETUDIANT'),
    email: z.string().email('Invalid email format'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    photoUrl: z.string().url().optional().nullable(),
    nom: z.string().min(1, 'Last name is required').max(100).trim(),
    prenom: z.string().min(1, 'First name is required').max(100).trim(),
    telephone: z
      .string()
      .regex(/^[0-9+\-\s()]+$/, 'Invalid phone number format')
      .max(20)
      .optional()
      .nullable(),
    anneeEntree: z
      .number()
      .int()
      .min(1900)
      .max(2100)
      .refine((year) => year <= new Date().getFullYear(), {
        message: 'Entry year cannot be in the future',
      }),
    salleId: z.string().uuid('Invalid salle ID format').optional().nullable(),
  }),

  // ENSEIGNANT
  z.object({
    role: z.literal('ENSEIGNANT'),
    email: z.string().email('Invalid email format'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    photoUrl: z.string().url().optional().nullable(),
    nom: z.string().min(1, 'Last name is required').max(100).trim(),
    prenom: z.string().min(1, 'First name is required').max(100).trim(),
    telephone: z
      .string()
      .regex(/^[0-9+\-\s()]+$/, 'Invalid phone number format')
      .max(20)
      .optional()
      .nullable(),
    datePriseFonction: z.string().optional(), // ISO date string
    indice: z.number().int().min(0).optional().default(1000),
    matiereId: z.string().uuid().optional().nullable(),
  }),

  // PARENT
  z.object({
    role: z.literal('PARENT'),
    email: z.string().email('Invalid email format'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    photoUrl: z.string().url().optional().nullable(),
    nom: z.string().min(1, 'Last name is required').max(100).trim(),
    prenom: z.string().min(1, 'First name is required').max(100).trim(),
    telephone: z
      .string()
      .regex(/^[0-9+\-\s()]+$/, 'Invalid phone number format')
      .max(20)
      .optional()
      .nullable(),
  }),
]);

/**
 * Create etudiant with user account schema (legacy - for backward compatibility)
 * Creates both user account and student profile in one transaction
 */
export const createEtudiantWithUserSchema = z.object({
  // User account data
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  photoUrl: z.string().url().optional().nullable(),

  // Student profile data
  nom: z.string().min(1, 'Last name is required').max(100).trim(),
  prenom: z.string().min(1, 'First name is required').max(100).trim(),
  telephone: z
    .string()
    .regex(/^[0-9+\-\s()]+$/, 'Invalid phone number format')
    .max(20)
    .optional()
    .nullable(),
  anneeEntree: z
    .number()
    .int()
    .min(1900)
    .max(2100)
    .refine((year) => year <= new Date().getFullYear(), {
      message: 'Entry year cannot be in the future',
    }),
});

/**
 * Create etudiant schema (for existing user)
 */
export const createEtudiantSchema = z.object({
  userId: z.string().uuid({ message: 'User ID must be a valid UUID' }),
  nom: z.string().min(1, 'Last name is required').max(100).trim(),
  prenom: z.string().min(1, 'First name is required').max(100).trim(),
  telephone: z
    .string()
    .regex(/^[0-9+\-\s()]+$/, 'Invalid phone number format')
    .max(20)
    .optional()
    .nullable(),
  anneeEntree: z
    .number()
    .int()
    .min(1900)
    .max(2100)
    .refine((year) => year <= new Date().getFullYear(), {
      message: 'Entry year cannot be in the future',
    }),
});

/**
 * Update etudiant schema - all fields optional
 */
export const updateEtudiantSchema = z
  .object({
    nom: z.string().min(1).max(100).trim().optional(),
    prenom: z.string().min(1).max(100).trim().optional(),
    telephone: z
      .string()
      .regex(/^[0-9+\-\s()]+$/)
      .max(20)
      .optional()
      .nullable(),
    anneeEntree: z
      .number()
      .int()
      .min(1900)
      .max(2100)
      .optional()
      .refine(
        (year) => !year || year <= new Date().getFullYear(),
        'Entry year cannot be in the future'
      ),
  })
  .strict();

/**
 * Etudiant ID param schema
 */
export const etudiantIdSchema = z.object({
  id: z.string().uuid({ message: 'Invalid etudiant ID format' }),
});

/**
 * TypeScript types inferred from schemas
 */
export type CreateUserWithProfileInput = z.infer<typeof createUserWithProfileSchema>;
export type CreateEtudiantWithUserInput = z.infer<typeof createEtudiantWithUserSchema>;
export type CreateEtudiantInput = z.infer<typeof createEtudiantSchema>;
export type UpdateEtudiantInput = z.infer<typeof updateEtudiantSchema>;
export type EtudiantIdParam = z.infer<typeof etudiantIdSchema>;
