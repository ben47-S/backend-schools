/**
 * AnneeScolaire Validation Schemas
 * Zod schemas for academic year-related requests
 */

import { z } from 'zod';

/**
 * Create annee scolaire schema
 */
export const createAnneeScolaireSchema = z
  .object({
    libelle: z
      .string()
      .min(1)
      .max(50)
      .regex(/^\d{4}-\d{4}$/, 'Format attendu: YYYY-YYYY (ex: 2024-2025)'),

    dateDebut: z.coerce.date(),
    dateFin: z.coerce.date(),
    dateOuvertureInscriptions: z.coerce.date(),
    dateFermetureInscriptions: z.coerce.date(),

    estActive: z.boolean().optional().default(false),
  })
  .superRefine((data, ctx) => {
    const { dateDebut, dateFin, dateOuvertureInscriptions, dateFermetureInscriptions, libelle } = data;

    // 1️⃣ début < fin
    if (dateDebut >= dateFin) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'La date de début doit être antérieure à la date de fin',
        path: ['dateFin'],
      });
    }

    // 2️⃣ ouverture dans la période
    if (dateOuvertureInscriptions < dateDebut || dateOuvertureInscriptions > dateFin) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "La date d'ouverture des inscriptions doit être dans la période de l'année scolaire",
        path: ['dateOuvertureInscriptions'],
      });
    }

    // 3️⃣ fermeture dans la période
    if (dateFermetureInscriptions < dateDebut || dateFermetureInscriptions > dateFin) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "La date de fermeture des inscriptions doit être dans la période de l'année scolaire",
        path: ['dateFermetureInscriptions'],
      });
    }

    // 4️⃣ ouverture < fermeture
    if (dateOuvertureInscriptions >= dateFermetureInscriptions) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "La date d'ouverture doit être avant la date de fermeture",
        path: ['dateFermetureInscriptions'],
      });
    }

    // 5️⃣ cohérence avec libelle
    const [anneeDebut, anneeFin] = libelle.split('-').map(Number);

    if (
      dateDebut.getFullYear() !== anneeDebut ||
      dateFin.getFullYear() !== anneeFin
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Les années du libellé doivent correspondre aux dates',
        path: ['libelle'],
      });
    }
  });


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
