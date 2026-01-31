/**
 * AnneeScolaire Validation Schemas
 * Zod schemas for academic year-related requests
 */

import { z } from 'zod';

/**
 * Create annee scolaire schema
 */
export const createAnneeScolaireSchema = z.object({
  libelle: z
    .string()
    .min(1, 'Le libellé est requis')
    .max(50, 'Le libellé est trop long')
    .regex(/^\d{4}-\d{4}$/, 'Format attendu: YYYY-YYYY (ex: 2024-2025)'),
  dateDebut: z.string().datetime('Date de début invalide'),
  dateFin: z.string().datetime('Date de fin invalide'),
  estActive: z.boolean().optional().default(false),
}).refine(
  (data) => {
    const debut = new Date(data.dateDebut);
    const fin = new Date(data.dateFin);
    return debut < fin;
  },
  {
    message: 'La date de début doit être antérieure à la date de fin',
    path: ['dateFin'],
  }
);

export type CreateAnneeScolaireInput = z.infer<typeof createAnneeScolaireSchema>;

/**
 * Update annee scolaire schema
 */
export const updateAnneeScolaireSchema = z.object({
  libelle: z
    .string()
    .min(1)
    .max(50)
    .regex(/^\d{4}-\d{4}$/, 'Format attendu: YYYY-YYYY (ex: 2024-2025)')
    .optional(),
  dateDebut: z.string().datetime('Date de début invalide').optional(),
  dateFin: z.string().datetime('Date de fin invalide').optional(),
}).refine(
  (data) => {
    if (data.dateDebut && data.dateFin) {
      const debut = new Date(data.dateDebut);
      const fin = new Date(data.dateFin);
      return debut < fin;
    }
    return true;
  },
  {
    message: 'La date de début doit être antérieure à la date de fin',
    path: ['dateFin'],
  }
);

export type UpdateAnneeScolaireInput = z.infer<typeof updateAnneeScolaireSchema>;

/**
 * AnneeScolaire ID param schema
 */
export const anneeScolaireIdSchema = z.object({
  id: z.string().uuid('ID d\'année scolaire invalide'),
});

export type AnneeScolaireIdParam = z.infer<typeof anneeScolaireIdSchema>;
