/**
 * College Service
 * Business logic for college management
 */

import { prisma } from '../lib/prisma';
import { NotFoundError, ForbiddenError } from '../utils/errors';
import { logger } from '../utils/logger';
import type { CreateCollegeInput, UpdateCollegeInput } from '../schemas/college.schemas';

/**
 * Get all colleges
 * ADMIN_GLOBAL: all colleges
 * ADMIN_COLLEGE: only their college
 */
export async function getAllColleges(userId: string, userRole: string) {
  logger.debug('Fetching colleges', { userId, userRole });

  // ADMIN_GLOBAL voit tous les collèges
  if (userRole === 'ADMIN_GLOBAL') {
    const colleges = await prisma.college.findMany({
      orderBy: { nom: 'asc' },
    });

    logger.crud('READ', 'College', userId, undefined, {
      count: colleges.length,
      filter: 'all',
    });

    return colleges;
  }

  // ADMIN_COLLEGE voit uniquement son collège
  if (userRole === 'ADMIN_COLLEGE') {
    const adminCollege = await prisma.adminCollege.findUnique({
      where: { userId },
      include: { college: true },
    });

    if (!adminCollege) {
      logger.warn('Admin college not found', { userId });
      throw new NotFoundError('Admin college configuration not found');
    }

    logger.crud('READ', 'College', userId, adminCollege.collegeId, {
      filter: 'own',
    });

    return [adminCollege.college];
  }

  // Autres rôles n'ont pas accès
  logger.access(userId, 'College', 'READ_ALL', false, 'Insufficient permissions');
  throw new ForbiddenError('Insufficient permissions to view colleges');
}

/**
 * Get college by ID
 */
export async function getCollegeById(
  collegeId: string,
  userId: string,
  userRole: string
) {
  logger.debug('Fetching college by ID', { collegeId, userId, userRole });

  // Vérifier que le collège existe
  const college = await prisma.college.findUnique({
    where: { id: collegeId },
    include: {
      _count: {
        select: {
          departements: true,
          salles: true,
          inscriptions: true,
        },
      },
    },
  });

  if (!college) {
    logger.warn('College not found', { collegeId, userId });
    throw new NotFoundError('College not found');
  }

  // ADMIN_GLOBAL peut voir n'importe quel collège
  if (userRole === 'ADMIN_GLOBAL') {
    logger.crud('READ', 'College', userId, collegeId);
    return college;
  }

  // ADMIN_COLLEGE ne peut voir que son collège
  if (userRole === 'ADMIN_COLLEGE') {
    const adminCollege = await prisma.adminCollege.findUnique({
      where: { userId },
    });

    if (!adminCollege || adminCollege.collegeId !== collegeId) {
      logger.access(userId, 'College', 'READ', false, 'Not their college');
      throw new ForbiddenError('You can only view your own college');
    }

    logger.crud('READ', 'College', userId, collegeId);
    return college;
  }

  logger.access(userId, 'College', 'READ', false, 'Insufficient permissions');
  throw new ForbiddenError('Insufficient permissions to view this college');
}

/**
 * Create a new college
 * Only ADMIN_GLOBAL can create
 */
export async function createCollege(data: CreateCollegeInput, userId: string) {
  logger.debug('Creating college', { userId, nom: data.nom });

  const college = await prisma.college.create({
    data: {
      nom: data.nom,
      adresse: data.adresse,
      siteWeb: data.siteWeb,
    },
  });

  logger.crud('CREATE', 'College', userId, college.id, {
    nom: college.nom,
  });

  logger.info(`College created: ${college.nom}`, {
    collegeId: college.id,
    userId,
  });

  return college;
}

/**
 * Update a college
 * ADMIN_GLOBAL: can update any college
 * ADMIN_COLLEGE: can update only their college
 */
export async function updateCollege(
  collegeId: string,
  data: UpdateCollegeInput,
  userId: string,
  userRole: string
) {
  logger.debug('Updating college', { collegeId, userId, userRole });

  // Vérifier que le collège existe
  const existingCollege = await prisma.college.findUnique({
    where: { id: collegeId },
  });

  if (!existingCollege) {
    logger.warn('College not found for update', { collegeId, userId });
    throw new NotFoundError('College not found');
  }

  // ADMIN_COLLEGE ne peut modifier que son collège
  if (userRole === 'ADMIN_COLLEGE') {
    const adminCollege = await prisma.adminCollege.findUnique({
      where: { userId },
    });

    if (!adminCollege || adminCollege.collegeId !== collegeId) {
      logger.access(userId, 'College', 'UPDATE', false, 'Not their college');
      throw new ForbiddenError('You can only update your own college');
    }
  }

  // Mettre à jour
  const college = await prisma.college.update({
    where: { id: collegeId },
    data: {
      ...(data.nom && { nom: data.nom }),
      ...(data.adresse && { adresse: data.adresse }),
      ...(data.siteWeb !== undefined && { siteWeb: data.siteWeb }),
    },
  });

  logger.crud('UPDATE', 'College', userId, collegeId, {
    changes: data,
  });

  logger.info(`College updated: ${college.nom}`, {
    collegeId: college.id,
    userId,
  });

  return college;
}

/**
 * Delete a college
 * Only ADMIN_GLOBAL can delete
 */
export async function deleteCollege(collegeId: string, userId: string) {
  logger.debug('Deleting college', { collegeId, userId });

  // Vérifier que le collège existe
  const existingCollege = await prisma.college.findUnique({
    where: { id: collegeId },
  });

  if (!existingCollege) {
    logger.warn('College not found for deletion', { collegeId, userId });
    throw new NotFoundError('College not found');
  }

  // Supprimer (cascade delete géré par Prisma)
  await prisma.college.delete({
    where: { id: collegeId },
  });

  logger.crud('DELETE', 'College', userId, collegeId, {
    nom: existingCollege.nom,
  });

  logger.info(`College deleted: ${existingCollege.nom}`, {
    collegeId,
    userId,
  });

  return { message: 'College deleted successfully' };
}
