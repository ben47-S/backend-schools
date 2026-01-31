/**
 * AnneeScolaire Service
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

  const annees = await prisma.anneeScolaire.findMany({
    orderBy: { dateDebut: 'desc' }, // Plus récente en premier
  });

  logger.crud('READ', 'AnneeScolaire', userId, undefined, {
    count: annees.length,
  });

  return annees;
}

/**
 * Get active academic year
 * Accessible to all authenticated users
 */
export async function getActiveAnneeScolaire(userId?: string) {
  logger.debug('Fetching active academic year', { userId });

  const annee = await prisma.anneeScolaire.findFirst({
    where: { estActive: true },
  });

  if (!annee) {
    logger.warn('No active academic year found', { userId });
    throw new NotFoundError('Aucune année scolaire active trouvée');
  }

  logger.crud('READ', 'AnneeScolaire', userId || 'anonymous', annee.id, {
    type: 'active',
  });

  return annee;
}

/**
 * Get academic year by ID
 */
export async function getAnneeScolaireById(id: string, userId: string) {
  logger.debug('Fetching academic year by ID', { id, userId });

  const annee = await prisma.anneeScolaire.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          inscriptions: true,
          notes: true,
          enseignantDepartements: true,
        },
      },
    },
  });

  if (!annee) {
    logger.warn('Academic year not found', { id, userId });
    throw new NotFoundError('Année scolaire introuvable');
  }

  logger.crud('READ', 'AnneeScolaire', userId, id);

  return annee;
}

/**
 * Create a new academic year
 * Only ADMIN_GLOBAL can create
 */
export async function createAnneeScolaire(
  data: CreateAnneeScolaireInput,
  userId: string
) {
  logger.debug('Creating academic year', { userId, libelle: data.libelle });

  // Vérifier si le libellé existe déjà
  const existing = await prisma.anneeScolaire.findUnique({
    where: { libelle: data.libelle },
  });

  if (existing) {
    logger.warn('Academic year already exists', {
      libelle: data.libelle,
      userId,
    });
    throw new ConflictError(
      `L'année scolaire ${data.libelle} existe déjà`
    );
  }

  // Si on veut créer une année active, désactiver les autres
  if (data.estActive) {
    logger.info('Deactivating other academic years', { userId });
    await prisma.anneeScolaire.updateMany({
      where: { estActive: true },
      data: { estActive: false },
    });
  }

  const annee = await prisma.anneeScolaire.create({
    data: {
      libelle: data.libelle,
      dateDebut: new Date(data.dateDebut),
      dateFin: new Date(data.dateFin),
      estActive: data.estActive || false,
    },
  });

  logger.crud('CREATE', 'AnneeScolaire', userId, annee.id, {
    libelle: annee.libelle,
    estActive: annee.estActive,
  });

  logger.info(`Academic year created: ${annee.libelle}`, {
    anneeId: annee.id,
    userId,
    estActive: annee.estActive,
  });

  return annee;
}

/**
 * Update an academic year
 * Only ADMIN_GLOBAL can update
 */
export async function updateAnneeScolaire(
  id: string,
  data: UpdateAnneeScolaireInput,
  userId: string
) {
  logger.debug('Updating academic year', { id, userId });

  // Vérifier que l'année existe
  const existing = await prisma.anneeScolaire.findUnique({
    where: { id },
  });

  if (!existing) {
    logger.warn('Academic year not found for update', { id, userId });
    throw new NotFoundError('Année scolaire introuvable');
  }

  // Si on change le libellé, vérifier qu'il n'existe pas déjà
  if (data.libelle && data.libelle !== existing.libelle) {
    const duplicate = await prisma.anneeScolaire.findUnique({
      where: { libelle: data.libelle },
    });

    if (duplicate) {
      logger.warn('Academic year libelle already exists', {
        libelle: data.libelle,
        userId,
      });
      throw new ConflictError(
        `L'année scolaire ${data.libelle} existe déjà`
      );
    }
  }

  const annee = await prisma.anneeScolaire.update({
    where: { id },
    data: {
      ...(data.libelle && { libelle: data.libelle }),
      ...(data.dateDebut && { dateDebut: new Date(data.dateDebut) }),
      ...(data.dateFin && { dateFin: new Date(data.dateFin) }),
    },
  });

  logger.crud('UPDATE', 'AnneeScolaire', userId, id, {
    changes: data,
  });

  logger.info(`Academic year updated: ${annee.libelle}`, {
    anneeId: annee.id,
    userId,
  });

  return annee;
}

/**
 * Activate an academic year
 * Deactivates all other years automatically
 * Only ADMIN_GLOBAL can activate
 */
export async function activateAnneeScolaire(id: string, userId: string) {
  logger.debug('Activating academic year', { id, userId });

  // Vérifier que l'année existe
  const annee = await prisma.anneeScolaire.findUnique({
    where: { id },
  });

  if (!annee) {
    logger.warn('Academic year not found for activation', { id, userId });
    throw new NotFoundError('Année scolaire introuvable');
  }

  if (annee.estActive) {
    logger.warn('Academic year already active', { id, userId });
    throw new BadRequestError('Cette année scolaire est déjà active');
  }

  // Transaction : désactiver toutes les autres et activer celle-ci
  const result = await prisma.$transaction(async (tx) => {
    // Désactiver toutes les années
    await tx.anneeScolaire.updateMany({
      where: { estActive: true },
      data: { estActive: false },
    });

    // Activer l'année demandée
    const activated = await tx.anneeScolaire.update({
      where: { id },
      data: { estActive: true },
    });

    return activated;
  });

  logger.crud('UPDATE', 'AnneeScolaire', userId, id, {
    action: 'activate',
    previouslyActive: false,
  });

  logger.info(`Academic year activated: ${result.libelle}`, {
    anneeId: result.id,
    userId,
  });

  return result;
}

/**
 * Deactivate an academic year
 * Only ADMIN_GLOBAL can deactivate
 */
export async function deactivateAnneeScolaire(id: string, userId: string) {
  logger.debug('Deactivating academic year', { id, userId });

  // Vérifier que l'année existe
  const annee = await prisma.anneeScolaire.findUnique({
    where: { id },
  });

  if (!annee) {
    logger.warn('Academic year not found for deactivation', { id, userId });
    throw new NotFoundError('Année scolaire introuvable');
  }

  if (!annee.estActive) {
    logger.warn('Academic year already inactive', { id, userId });
    throw new BadRequestError('Cette année scolaire est déjà inactive');
  }

  const result = await prisma.anneeScolaire.update({
    where: { id },
    data: { estActive: false },
  });

  logger.crud('UPDATE', 'AnneeScolaire', userId, id, {
    action: 'deactivate',
  });

  logger.info(`Academic year deactivated: ${result.libelle}`, {
    anneeId: result.id,
    userId,
  });

  return result;
}

/**
 * Delete an academic year
 * Only ADMIN_GLOBAL can delete
 * Cannot delete if it has related data
 */
export async function deleteAnneeScolaire(id: string, userId: string) {
  logger.debug('Deleting academic year', { id, userId });

  // Vérifier que l'année existe
  const annee = await prisma.anneeScolaire.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          inscriptions: true,
          notes: true,
          enseignantDepartements: true,
        },
      },
    },
  });

  if (!annee) {
    logger.warn('Academic year not found for deletion', { id, userId });
    throw new NotFoundError('Année scolaire introuvable');
  }

  // Vérifier qu'elle n'a pas de données liées
  const hasData =
    annee._count.inscriptions > 0 ||
    annee._count.notes > 0 ||
    annee._count.enseignantDepartements > 0;

  if (hasData) {
    logger.warn('Cannot delete academic year with related data', {
      id,
      userId,
      counts: annee._count,
    });
    throw new BadRequestError(
      'Impossible de supprimer une année scolaire contenant des données (inscriptions, notes, etc.)'
    );
  }

  await prisma.anneeScolaire.delete({
    where: { id },
  });

  logger.crud('DELETE', 'AnneeScolaire', userId, id, {
    libelle: annee.libelle,
  });

  logger.info(`Academic year deleted: ${annee.libelle}`, {
    anneeId: id,
    userId,
  });

  return { message: 'Année scolaire supprimée avec succès' };
}
