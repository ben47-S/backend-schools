/**
 * Salle Validation Schemas
 * Zod schemas for validating classroom-related requests
 */

import { z } from 'zod';

/**
 * Schema for creating a new classroom
 */
export const createSalleSchema = z.object({
  numero: z
    .string()
    .min(1, 'Le numéro est requis')
    .max(20, 'Le numéro ne peut pas dépasser 20 caractères')
    .trim(),
  nbPlaces: z
    .number()
    .int('Le nombre de places doit être un entier')
    .min(1, 'Le nombre de places doit être au moins 1')
    .max(500, 'Le nombre de places ne peut pas dépasser 500'),
  collegeId: z
    .string()
    .uuid('ID de collège invalide'),
  departementId: z
    .string()
    .uuid('ID de département invalide')
    .optional()
    .nullable(),
});

/**
 * Schema for updating a classroom
 */
export const updateSalleSchema = z.object({
  numero: z
    .string()
    .min(1, 'Le numéro est requis')
    .max(20, 'Le numéro ne peut pas dépasser 20 caractères')
    .trim()
    .optional(),
  nbPlaces: z
    .number()
    .int('Le nombre de places doit être un entier')
    .min(1, 'Le nombre de places doit être au moins 1')
    .max(500, 'Le nombre de places ne peut pas dépasser 500')
    .optional(),
  departementId: z
    .string()
    .uuid('ID de département invalide')
    .optional()
    .nullable(),
});

/**
 * Schema for classroom ID parameter
 */
export const salleIdSchema = z.object({
  id: z.string().uuid('ID de salle invalide'),
});

/**
 * Schema for querying classrooms by college
 */
export const getSallesByCollegeSchema = z.object({
  collegeId: z.string().uuid('ID de collège invalide'),
});
