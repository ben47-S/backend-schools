/**
 * Enseignant Validation Schemas
 * Zod schemas for validating teacher-related requests
 */

import { z } from 'zod';

/**
 * Schema for creating a new teacher
 */
export const createEnseignantSchema = z.object({
  userId: z
    .string()
    .uuid('ID utilisateur invalide'),
  nom: z
    .string()
    .min(1, 'Le nom est requis')
    .max(100, 'Le nom ne peut pas dépasser 100 caractères')
    .trim(),
  prenom: z
    .string()
    .min(1, 'Le prénom est requis')
    .max(100, 'Le prénom ne peut pas dépasser 100 caractères')
    .trim(),
  telephone: z
    .string()
    .regex(/^[0-9+\-\s()]+$/, 'Format de téléphone invalide')
    .max(20, 'Le téléphone ne peut pas dépasser 20 caractères')
    .optional()
    .nullable(),
  datePriseFonction: z
    .string()
    .datetime('Date de prise de fonction invalide'),
  indice: z
    .number()
    .int('L\'indice doit être un entier')
    .min(1, 'L\'indice doit être au moins 1')
    .max(1000, 'L\'indice ne peut pas dépasser 1000'),
  matiereId: z
    .string()
    .uuid('ID de matière invalide')
    .optional()
    .nullable(),
});

/**
 * Schema for updating a teacher
 */
export const updateEnseignantSchema = z.object({
  nom: z
    .string()
    .min(1, 'Le nom est requis')
    .max(100, 'Le nom ne peut pas dépasser 100 caractères')
    .trim()
    .optional(),
  prenom: z
    .string()
    .min(1, 'Le prénom est requis')
    .max(100, 'Le prénom ne peut pas dépasser 100 caractères')
    .trim()
    .optional(),
  telephone: z
    .string()
    .regex(/^[0-9+\-\s()]+$/, 'Format de téléphone invalide')
    .max(20, 'Le téléphone ne peut pas dépasser 20 caractères')
    .optional()
    .nullable(),
  datePriseFonction: z
    .string()
    .datetime('Date de prise de fonction invalide')
    .optional(),
  indice: z
    .number()
    .int('L\'indice doit être un entier')
    .min(1, 'L\'indice doit être au moins 1')
    .max(1000, 'L\'indice ne peut pas dépasser 1000')
    .optional(),
  matiereId: z
    .string()
    .uuid('ID de matière invalide')
    .optional()
    .nullable(),
});

/**
 * Schema for teacher ID parameter
 */
export const enseignantIdSchema = z.object({
  id: z.string().uuid('ID enseignant invalide'),
});

/**
 * Schema for assigning teacher to department
 */
export const assignDepartementSchema = z.object({
  departementId: z
    .string()
    .uuid('ID de département invalide'),
  anneeScolaireId: z
    .string()
    .uuid('ID d\'année scolaire invalide'),
  estResponsable: z
    .boolean()
    .optional()
    .default(false),
});

/**
 * Schema for removing teacher from department
 */
export const removeDepartementSchema = z.object({
  departementId: z
    .string()
    .uuid('ID de département invalide'),
  anneeScolaireId: z
    .string()
    .uuid('ID d\'année scolaire invalide'),
});

/**
 * Create teacher demand schema
 * ADMIN sends a demand to a teacher for a department
 */
export const createEnseignantDemandeSchema = z.object({
  enseignantId: z.string().uuid('ID enseignant invalide'),
  departementId: z.string().uuid('ID département invalide'),
  anneeScolaireId: z.string().uuid('ID année scolaire invalide'),
});

export type CreateEnseignantDemandeInput = z.infer<typeof createEnseignantDemandeSchema>;

/**
 * Respond to demand schema
 * Teacher accepts or refuses a demand
 */
export const repondreDemandeSchema = z.object({
  statut: z.enum(['ACCEPTE', 'REFUSE'], {
    errorMap: () => ({ message: 'Statut must be ACCEPTE or REFUSE' }),
  }),
});

export type RepondreDemandeInput = z.infer<typeof repondreDemandeSchema>;

/**
 * Enseignant demand ID schema
 */
export const enseignantDemandeIdSchema = z.object({
  demandeId: z.string().uuid('ID demande invalide'),
});

export type EnseignantDemandeIdInput = z.infer<typeof enseignantDemandeIdSchema>;
