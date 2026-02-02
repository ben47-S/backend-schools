/**
 * Annee_scolaire Service
 * Business logic for academic year management
 */

import { prisma } from '../lib/prisma';
import { NotFoundError, ConflictError, BadRequestError } from '../utils/errors';
import { logger } from '../utils/logger';
import type {
  CreateAnneeScolaireInput,
  UpdateAnneeScolaireInput,
} from '../schemas/anneeScolaire.schemas';

/**
 * Get all academic years
 */
export async function getAllAnneeScolaires(userId: string) {
  logger.debug('Fetching all academic years', { userId });

  const annees = await prisma.annees_scolaires.findMany({
    orderBy: { dateDebut: 'desc' },
  });

  logger.crud('READ', 'AnneeScolaire', userId, undefined, {
    count: annees.length,
  });

  return annees;
}

/**
 * Get active academic year
 */
export async function getActiveAnneeScolaire(userId?: string) {
  logger.debug('Fetching active academic year', { userId });

  const annee = await prisma.annees_scolaires.findFirst({
    where: { estActive: true },
  });

  if (!annee) {
    throw new NotFoundError('Aucune année scolaire active trouvée');
  }

  return annee;
}

/**
 * Get academic year by ID
 */
export async function getAnneeScolaireById(id: string, userId: string) {
  const annee = await prisma.annees_scolaires.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          inscriptions: true,
          notes: true,
          enseignant_departements: true,
        },
      },
    },
  });

  if (!annee) {
    throw new NotFoundError('Année scolaire introuvable');
  }

  return annee;
}

/**
 * Create a new academic year
 * estActive et inscriptionOuverte restent false par défaut
 */
export async function createAnneeScolaire(
  data: CreateAnneeScolaireInput,
  userId: string
) {
  return await prisma.$transaction(async (tx) => {
    const existing = await tx.annees_scolaires.findUnique({
      where: { libelle: data.libelle },
    });

    if (existing) {
      throw new ConflictError(
        `L'année scolaire ${data.libelle} existe déjà`
      );
    }

    const annee = await tx.annees_scolaires.create({
      data: {
        libelle: data.libelle,
        dateDebut: data.dateDebut,
        dateFin: data.dateFin,
        dateOuvertureInscriptions: data.dateOuvertureInscriptions,
        dateFermetureInscriptions: data.dateFermetureInscriptions,
        estActive: data.estActive ?? false,          // reste false par défaut
        estInscriptionOuverte: false,                  // calcul côté frontend
      },
    });

    return annee;
  });
}

/**
 * Update an academic year
 */
export async function updateAnneeScolaire(
  id: string,
  data: UpdateAnneeScolaireInput,
  userId: string
) {
  const existing = await prisma.annees_scolaires.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new NotFoundError('Année scolaire introuvable');
  }

  if (data.libelle && data.libelle !== existing.libelle) {
    const duplicate = await prisma.annees_scolaires.findUnique({
      where: { libelle: data.libelle },
    });

    if (duplicate) {
      throw new ConflictError(
        `L'année scolaire ${data.libelle} existe déjà`
      );
    }
  }

  return prisma.annees_scolaires.update({
    where: { id },
    data: {
      ...(data.libelle && { libelle: data.libelle }),
      ...(data.dateDebut && { dateDebut: data.dateDebut }),
      ...(data.dateFin && { dateFin: data.dateFin }),
    },
  });
}

/**
 * Activate an academic year
 */
export async function activateAnneeScolaire(id: string, userId: string) {
  const annee = await prisma.annees_scolaires.findUnique({ where: { id } });

  if (!annee) throw new NotFoundError('Année scolaire introuvable');
  if (annee.estActive) throw new BadRequestError('Cette année scolaire est déjà active');

  return prisma.$transaction(async (tx) => {
    await tx.annees_scolaires.updateMany({
      where: { estActive: true },
      data: { estActive: false },
    });

    return tx.annees_scolaires.update({
      where: { id },
      data: { estActive: true },
    });
  });
}

/**
 * Deactivate an academic year
 */
export async function deactivateAnneeScolaire(id: string, userId: string) {
  const annee = await prisma.annees_scolaires.findUnique({ where: { id } });

  if (!annee) throw new NotFoundError('Année scolaire introuvable');
  if (!annee.estActive) throw new BadRequestError('Cette année scolaire est déjà inactive');

  return prisma.annees_scolaires.update({
    where: { id },
    data: { estActive: false },
  });
}

/**
 * Delete an academic year
 */
export async function deleteAnneeScolaire(id: string, userId: string) {
  const annee = await prisma.annees_scolaires.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          inscriptions: true,
          notes: true,
          enseignant_departements: true,
        },
      },
    },
  });

  if (!annee) throw new NotFoundError('Année scolaire introuvable');

  const hasData =
    annee._count.inscriptions > 0 ||
    annee._count.notes > 0 ||
    annee._count.enseignant_departements > 0;

  if (hasData) throw new BadRequestError(
    'Impossible de supprimer une année scolaire contenant des données'
  );

  await prisma.annees_scolaires.delete({ where: { id } });

  return { message: 'Année scolaire supprimée avec succès' };
}
