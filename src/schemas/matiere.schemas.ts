/**
 * Matiere Validation Schemas
 * Zod schemas for validating subject-related requests
 */

import { z } from 'zod';

/**
 * Schema for creating a new subject
 */
export const createMatiereSchema = z.object({
  nom: z
    .string()
    .min(1, 'Le nom est requis')
    .max(100, 'Le nom ne peut pas dépasser 100 caractères')
    .trim(),
  departementId: z
    .string()
    .uuid('ID de département invalide'),
  salleId: z
    .string()
    .uuid('ID de salle invalide')
    .optional()
    .nullable(),
});

/**
 * Schema for updating a subject
 */
export const updateMatiereSchema = z.object({
  nom: z
    .string()
    .min(1, 'Le nom est requis')
    .max(100, 'Le nom ne peut pas dépasser 100 caractères')
    .trim()
    .optional(),
  salleId: z
    .string()
    .uuid('ID de salle invalide')
    .optional()
    .nullable(),
});

/**
 * Schema for subject ID parameter
 */
export const matiereIdSchema = z.object({
  id: z.string().uuid('ID de matière invalide'),
});

/**
 * Schema for querying subjects by department
 */
export const getMatieresByDepartementSchema = z.object({
  departementId: z.string().uuid('ID de département invalide'),
});
