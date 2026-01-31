/**
 * Etudiant Validation Schemas
 * Zod schemas for student operations
 */

import { z } from 'zod';

/**
 * Create etudiant schema
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
export type CreateEtudiantInput = z.infer<typeof createEtudiantSchema>;
export type UpdateEtudiantInput = z.infer<typeof updateEtudiantSchema>;
export type EtudiantIdParam = z.infer<typeof etudiantIdSchema>;
