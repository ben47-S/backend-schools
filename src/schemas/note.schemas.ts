/**
 * Note Schemas
 * Zod validation schemas for grade management
 */

import { z } from 'zod';

/**
 * Schema for creating a new grade
 */
export const createNoteSchema = z.object({
  valeur: z.number().min(0).max(20, 'La note doit être entre 0 et 20'),
  etudiantId: z.string().uuid('ID étudiant invalide'),
  matiereId: z.string().uuid('ID matière invalide'),
  anneeScolaireId: z.string().uuid('ID année scolaire invalide'),
  dateNote: z.string().datetime().optional(),
  commentaire: z.string().max(500, 'Le commentaire ne peut excéder 500 caractères').optional(),
});

/**
 * Schema for updating a grade
 * Cannot change student, subject, or academic year (unique constraint)
 */
export const updateNoteSchema = z.object({
  valeur: z.number().min(0).max(20, 'La note doit être entre 0 et 20').optional(),
  dateNote: z.string().datetime().optional(),
  commentaire: z.string().max(500, 'Le commentaire ne peut excéder 500 caractères').optional(),
});

/**
 * Schema for note ID parameter
 */
export const noteIdParamSchema = z.object({
  id: z.string().uuid('ID note invalide'),
});

/**
 * Schema for filtering notes
 */
export const noteFiltersSchema = z.object({
  etudiantId: z.string().uuid().optional(),
  matiereId: z.string().uuid().optional(),
  anneeScolaireId: z.string().uuid().optional(),
  collegeId: z.string().uuid().optional(),
});

/**
 * Schema for student statistics route parameter
 */
export const etudiantIdParamSchema = z.object({
  etudiantId: z.string().uuid('ID étudiant invalide'),
});

/**
 * Inferred TypeScript types
 */
export type CreateNoteInput = z.infer<typeof createNoteSchema>;
export type UpdateNoteInput = z.infer<typeof updateNoteSchema>;
export type NoteFilters = z.infer<typeof noteFiltersSchema>;
