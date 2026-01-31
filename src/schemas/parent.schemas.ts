/**
 * Parent Validation Schemas
 * Zod schemas for parent operations
 */

import { z } from 'zod';

/**
 * Create parent schema
 */
export const createParentSchema = z.object({
  userId: z.string().uuid({ message: 'User ID must be a valid UUID' }),
  nom: z.string().min(1, 'Last name is required').max(100).trim(),
  prenom: z.string().min(1, 'First name is required').max(100).trim(),
  telephone: z
    .string()
    .regex(/^[0-9+\-\s()]+$/, 'Invalid phone number format')
    .max(20)
    .optional()
    .nullable(),
});

/**
 * Update parent schema - all fields optional
 */
export const updateParentSchema = z
  .object({
    nom: z.string().min(1).max(100).trim().optional(),
    prenom: z.string().min(1).max(100).trim().optional(),
    telephone: z
      .string()
      .regex(/^[0-9+\-\s()]+$/)
      .max(20)
      .optional()
      .nullable(),
  })
  .strict();

/**
 * Parent ID param schema
 */
export const parentIdSchema = z.object({
  id: z.string().uuid({ message: 'Invalid parent ID format' }),
});

/**
 * Link/Unlink child schema
 */
export const linkChildSchema = z.object({
  etudiantId: z.string().uuid({ message: 'Invalid etudiant ID format' }),
});

export const unlinkChildSchema = z.object({
  etudiantId: z.string().uuid({ message: 'Invalid etudiant ID format' }),
});

/**
 * TypeScript types inferred from schemas
 */
export type CreateParentInput = z.infer<typeof createParentSchema>;
export type UpdateParentInput = z.infer<typeof updateParentSchema>;
export type ParentIdParam = z.infer<typeof parentIdSchema>;
export type LinkChildInput = z.infer<typeof linkChildSchema>;
export type UnlinkChildInput = z.infer<typeof unlinkChildSchema>;
