/**
 * Departement Validation Schemas
 * Zod schemas for validating department-related requests
 */

import { z } from 'zod';

/**
 * Schema for creating a new department
 */
export const createDepartementSchema = z.object({
  nom: z
    .string()
    .min(1, 'Le nom est requis')
    .max(100, 'Le nom ne peut pas dépasser 100 caractères')
    .trim(),
  collegeId: z
    .string()
    .uuid('ID de collège invalide'),
});

/**
 * Schema for updating a department
 */
export const updateDepartementSchema = z.object({
  nom: z
    .string()
    .min(1, 'Le nom est requis')
    .max(100, 'Le nom ne peut pas dépasser 100 caractères')
    .trim(),
});

/**
 * Schema for department ID parameter
 */
export const departementIdSchema = z.object({
  id: z.string().uuid('ID de département invalide'),
});

/**
 * Schema for querying departments by college
 */
export const getDepartementsByCollegeSchema = z.object({
  collegeId: z.string().uuid('ID de collège invalide'),
});
