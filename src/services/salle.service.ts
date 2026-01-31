/**
 * Salle Service
 * Business logic for classroom management with college isolation
 */

import { prisma } from '../lib/prisma';
import { logger } from '../utils/logger';
import {
  NotFoundError,
  ConflictError,
  ForbiddenError,
  BadRequestError,
} from '../utils/errors';

/**
 * Get all classrooms (with college isolation)
 * - ADMIN_GLOBAL: sees all classrooms
 * - ADMIN_COLLEGE: sees only classrooms from their college
 */
export async function getAllSalles(userId: string, userRole: string) {
  logger.debug('Fetching all classrooms', { userId, userRole });

  if (userRole === 'ADMIN_GLOBAL') {
    const salles = await prisma.salle.findMany({
      include: {
        college: {
          select: { id: true, nom: true },
        },
        _count: {
          select: {
            matieres: true,
          },
        },
      },
      orderBy: [{ college: { nom: 'asc' } }, { numero: 'asc' }],
    });

    logger.crud('READ', 'Salle', userId, undefined, {
      count: salles.length,
      filter: 'all',
    });

    return salles;
  }

  if (userRole === 'ADMIN_COLLEGE') {
    const adminCollege = await prisma.adminCollege.findUnique({
      where: { userId },
      select: { collegeId: true },
    });

    if (!adminCollege) {
      logger.warn('Admin college configuration not found', { userId });
      throw new NotFoundError('Configuration administrateur introuvable');
    }

    const salles = await prisma.salle.findMany({
      where: { collegeId: adminCollege.collegeId },
      include: {
        college: {
          select: { id: true, nom: true },
        },
        _count: {
          select: {
            matieres: true,
          },
        },
      },
      orderBy: { numero: 'asc' },
    });

    logger.crud('READ', 'Salle', userId, undefined, {
      count: salles.length,
      filter: 'college',
      collegeId: adminCollege.collegeId,
    });

    return salles;
  }

  logger.access(userId, 'Salle', 'READ_ALL', false, `Insufficient role: ${userRole}`);
  throw new ForbiddenError('Permissions insuffisantes pour voir les salles');
}

/**
 * Get classrooms by college ID
 */
export async function getSallesByCollege(
  collegeId: string,
  userId: string,
  userRole: string
) {
  logger.debug('Fetching classrooms by college', { collegeId, userId, userRole });

  // Verify college exists
  const college = await prisma.college.findUnique({
    where: { id: collegeId },
  });

  if (!college) {
    throw new NotFoundError('Collège introuvable');
  }

  // Check access rights for ADMIN_COLLEGE
  if (userRole === 'ADMIN_COLLEGE') {
    const adminCollege = await prisma.adminCollege.findUnique({
      where: { userId },
      select: { collegeId: true },
    });

    if (!adminCollege || adminCollege.collegeId !== collegeId) {
      logger.access(userId, 'Salle', 'READ_BY_COLLEGE', false, 'College mismatch');
      throw new ForbiddenError('Accès non autorisé à ce collège');
    }
  }

  const salles = await prisma.salle.findMany({
    where: { collegeId },
    include: {
      _count: {
        select: {
          matieres: true,
        },
      },
    },
    orderBy: { numero: 'asc' },
  });

  logger.crud('READ', 'Salle', userId, undefined, {
    count: salles.length,
    collegeId,
  });

  return salles;
}

/**
 * Get a single classroom by ID
 */
export async function getSalleById(
  id: string,
  userId: string,
  userRole: string
) {
  logger.debug('Fetching classroom by ID', { id, userId, userRole });

  const salle = await prisma.salle.findUnique({
    where: { id },
    include: {
      college: {
        select: { id: true, nom: true, adresse: true, siteWeb: true },
      },
      _count: {
        select: {
          matieres: true,
        },
      },
    },
  });

  if (!salle) {
    logger.warn('Classroom not found', { id });
    throw new NotFoundError('Salle introuvable');
  }

  // Check access for ADMIN_COLLEGE
  if (userRole === 'ADMIN_COLLEGE') {
    const adminCollege = await prisma.adminCollege.findUnique({
      where: { userId },
      select: { collegeId: true },
    });

    if (!adminCollege || adminCollege.collegeId !== salle.collegeId) {
      logger.access(userId, 'Salle', 'READ', false, 'College mismatch');
      throw new ForbiddenError('Accès non autorisé à cette salle');
    }
  }

  logger.crud('READ', 'Salle', userId, id);

  return salle;
}

/**
 * Create a new classroom
 */
export async function createSalle(
  data: {
    numero: string;
    nbPlaces: number;
    collegeId: string;
  },
  userId: string,
  userRole: string
) {
  logger.debug('Creating classroom', {
    userId,
    userRole,
    numero: data.numero,
    collegeId: data.collegeId,
  });

  // Verify college exists
  const college = await prisma.college.findUnique({
    where: { id: data.collegeId },
  });

  if (!college) {
    throw new NotFoundError('Collège introuvable');
  }

  // Check if ADMIN_COLLEGE is trying to create classroom for their college
  if (userRole === 'ADMIN_COLLEGE') {
    const adminCollege = await prisma.adminCollege.findUnique({
      where: { userId },
      select: { collegeId: true },
    });

    if (!adminCollege || adminCollege.collegeId !== data.collegeId) {
      logger.access(userId, 'Salle', 'CREATE', false, 'College mismatch');
      throw new ForbiddenError('Vous ne pouvez créer des salles que pour votre collège');
    }
  }

  // Check for duplicate numero within the same college
  const existingSalle = await prisma.salle.findFirst({
    where: {
      numero: data.numero,
      collegeId: data.collegeId,
    },
  });

  if (existingSalle) {
    logger.warn('Classroom numero already exists in college', {
      numero: data.numero,
      collegeId: data.collegeId,
    });
    throw new ConflictError(
      `La salle "${data.numero}" existe déjà dans ce collège`
    );
  }

  const salle = await prisma.salle.create({
    data: {
      numero: data.numero,
      nbPlaces: data.nbPlaces,
      collegeId: data.collegeId,
    },
    include: {
      college: {
        select: { id: true, nom: true },
      },
    },
  });

  logger.crud('CREATE', 'Salle', userId, salle.id, {
    numero: salle.numero,
    nbPlaces: salle.nbPlaces,
    collegeId: salle.collegeId,
  });

  logger.info(`Classroom created: ${salle.numero}`, {
    salleId: salle.id,
    collegeId: salle.collegeId,
    userId,
  });

  return salle;
}

/**
 * Update a classroom
 */
export async function updateSalle(
  id: string,
  data: {
    numero?: string;
    nbPlaces?: number;
  },
  userId: string,
  userRole: string
) {
  logger.debug('Updating classroom', { id, userId, userRole });

  const salle = await prisma.salle.findUnique({
    where: { id },
    select: { id: true, collegeId: true, numero: true },
  });

  if (!salle) {
    throw new NotFoundError('Salle introuvable');
  }

  // Check access for ADMIN_COLLEGE
  if (userRole === 'ADMIN_COLLEGE') {
    const adminCollege = await prisma.adminCollege.findUnique({
      where: { userId },
      select: { collegeId: true },
    });

    if (!adminCollege || adminCollege.collegeId !== salle.collegeId) {
      logger.access(userId, 'Salle', 'UPDATE', false, 'College mismatch');
      throw new ForbiddenError('Accès non autorisé à cette salle');
    }
  }

  // Check for duplicate numero if numero is being updated
  if (data.numero && data.numero !== salle.numero) {
    const existingSalle = await prisma.salle.findFirst({
      where: {
        numero: data.numero,
        collegeId: salle.collegeId,
        id: { not: id },
      },
    });

    if (existingSalle) {
      logger.warn('Classroom numero already exists', {
        numero: data.numero,
        collegeId: salle.collegeId,
      });
      throw new ConflictError(`La salle "${data.numero}" existe déjà dans ce collège`);
    }
  }

  const updated = await prisma.salle.update({
    where: { id },
    data: {
      numero: data.numero,
      nbPlaces: data.nbPlaces,
    },
    include: {
      college: {
        select: { id: true, nom: true },
      },
    },
  });

  logger.crud('UPDATE', 'Salle', userId, id, {
    changes: data,
  });

  logger.info(`Classroom updated: ${updated.numero}`, {
    salleId: id,
    userId,
  });

  return updated;
}

/**
 * Delete a classroom
 * Only allowed if no subjects are associated
 */
export async function deleteSalle(
  id: string,
  userId: string,
  userRole: string
) {
  logger.debug('Deleting classroom', { id, userId, userRole });

  const salle = await prisma.salle.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          matieres: true,
        },
      },
    },
  });

  if (!salle) {
    throw new NotFoundError('Salle introuvable');
  }

  // Check access for ADMIN_COLLEGE
  if (userRole === 'ADMIN_COLLEGE') {
    const adminCollege = await prisma.adminCollege.findUnique({
      where: { userId },
      select: { collegeId: true },
    });

    if (!adminCollege || adminCollege.collegeId !== salle.collegeId) {
      logger.access(userId, 'Salle', 'DELETE', false, 'College mismatch');
      throw new ForbiddenError('Accès non autorisé à cette salle');
    }
  }

  // Check for associated subjects
  if (salle._count.matieres > 0) {
    logger.warn('Cannot delete classroom with subjects', {
      id,
      subjectCount: salle._count.matieres,
    });
    throw new BadRequestError(
      `Impossible de supprimer: ${salle._count.matieres} matière(s) associée(s)`
    );
  }

  await prisma.salle.delete({
    where: { id },
  });

  logger.crud('DELETE', 'Salle', userId, id);
  logger.info('Classroom deleted', { salleId: id, userId });

  return { message: 'Salle supprimée avec succès' };
}
