/**
 * Inscription Validation Schemas
 * Zod schemas for student enrollment operations
 */

import { z } from 'zod';

/**
 * Create inscription schema
 */
export const createInscriptionSchema = z.object({
  etudiantId: z.string().uuid({ message: 'Etudiant ID must be a valid UUID' }),
  collegeId: z.string().uuid({ message: 'College ID must be a valid UUID' }),
  anneeScolaireId: z.string().uuid({ message: 'Annee Scolaire ID must be a valid UUID' }),
  dateInscription: z.string().datetime().optional(),
});

/**
 * Update inscription schema
 */
export const updateInscriptionSchema = z
  .object({
    collegeId: z.string().uuid().optional(),
    dateInscription: z.string().datetime().optional(),
  })
  .strict();

/**
 * Inscription ID param schema
 */
export const inscriptionIdSchema = z.object({
  id: z.string().uuid({ message: 'Invalid inscription ID format' }),
});

/**
 * Query filters schema
 */
export const inscriptionFiltersSchema = z.object({
  collegeId: z.string().uuid().optional(),
  anneeScolaireId: z.string().uuid().optional(),
  etudiantId: z.string().uuid().optional(),
});

/**
 * TypeScript types inferred from schemas
 */
export type CreateInscriptionInput = z.infer<typeof createInscriptionSchema>;
export type UpdateInscriptionInput = z.infer<typeof updateInscriptionSchema>;
export type InscriptionIdParam = z.infer<typeof inscriptionIdSchema>;
export type InscriptionFilters = z.infer<typeof inscriptionFiltersSchema>;
