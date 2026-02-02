/**
 * College Validation Schemas
 * Zod schemas for college-related requests
 */

import { z } from 'zod';

/**
 * Create college schema
 */
export const createCollegeSchema = z.object({
  nom: z.string().min(1, 'Le nom est requis').max(255, 'Le nom est trop long'),
  adresse: z.string().min(1, 'L\'adresse est requise').max(500, 'L\'adresse est trop longue'),
  siteWeb: z.string().url('URL invalide').optional().nullable(),
});

export type CreateCollegeInput = z.infer<typeof createCollegeSchema>;

/**
 * Create college with admin schema
 * Used by ADMIN_GLOBAL to create a college and its administrator in one operation
 */
export const createCollegeWithAdminSchema = z.object({
  // College data
  nom: z.string().min(1, 'Le nom du collège est requis').max(255, 'Le nom est trop long'),
  adresse: z.string().min(1, 'L\'adresse est requise').max(500, 'L\'adresse est trop longue'),
  siteWeb: z.string().url('URL invalide').optional().nullable(),

  // Admin user data
  adminEmail: z.string().email('Email admin invalide'),
  adminPassword: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères'),
  adminNom: z.string().min(1, 'Le nom de l\'admin est requis').max(100, 'Le nom est trop long'),
  adminPrenom: z.string().min(1, 'Le prénom de l\'admin est requis').max(100, 'Le prénom est trop long'),
  adminTelephone: z.string().optional(),
  adminPhotoUrl: z.string().url('URL photo invalide').optional().nullable(),
});

export type CreateCollegeWithAdminInput = z.infer<typeof createCollegeWithAdminSchema>;

/**
 * Update college schema (tous les champs optionnels)
 */
export const updateCollegeSchema = z.object({
  nom: z.string().min(1).max(255).optional(),
  adresse: z.string().min(1).max(500).optional(),
  siteWeb: z.string().url('URL invalide').optional().nullable(),
});

export type UpdateCollegeInput = z.infer<typeof updateCollegeSchema>;

/**
 * College ID param schema
 */
export const collegeIdSchema = z.object({
  id: z.string().uuid('ID de collège invalide'),
});

export type CollegeIdParam = z.infer<typeof collegeIdSchema>;
