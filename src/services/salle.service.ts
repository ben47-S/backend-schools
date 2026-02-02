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
    const salles = await prisma.salles.findMany({
      include: {
        college: {
          select: { id: true, nom: true },
        },
        departement: {
          select: { id: true, nom: true },
        },
        _count: {
          select: {
            matieres: true,
            inscriptions: true,
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
    const adminCollege = await prisma.admin_colleges.findUnique({
      where: { userId },
      select: { collegeId: true },
    });

    if (!adminCollege) {
      logger.warn('Admin college configuration not found', { userId });
      throw new NotFoundError('Configuration administrateur introuvable');
    }

    const salles = await prisma.salles.findMany({
      where: { collegeId: adminCollege.collegeId },
      include: {
        college: {
          select: { id: true, nom: true },
        },
        departement: {
          select: { id: true, nom: true },
        },
        _count: {
          select: {
            matieres: true,
            inscriptions: true,
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
  const college = await prisma.colleges.findUnique({
    where: { id: collegeId },
  });

  if (!college) {
    throw new NotFoundError('Collège introuvable');
  }

  // Check access rights for ADMIN_COLLEGE
  if (userRole === 'ADMIN_COLLEGE') {
    const adminCollege = await prisma.admin_colleges.findUnique({
      where: { userId },
      select: { collegeId: true },
    });

    if (!adminCollege || adminCollege.collegeId !== collegeId) {
      logger.access(userId, 'Salle', 'READ_BY_COLLEGE', false, 'College mismatch');
      throw new ForbiddenError('Accès non autorisé à ce collège');
    }
  }

  const salles = await prisma.salles.findMany({
    where: { collegeId },
    include: {
      departement: {
        select: { id: true, nom: true },
      },
      _count: {
        select: {
          matieres: true,
          inscriptions: true,
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

  const salle = await prisma.salles.findUnique({
    where: { id },
    include: {
      college: {
        select: { id: true, nom: true, adresse: true, siteWeb: true },
      },
      departement: {
        select: { id: true, nom: true },
      },
      _count: {
        select: {
          matieres: true,
          inscriptions: true,
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
    const adminCollege = await prisma.admin_colleges.findUnique({
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
    departementId?: string | null;
  },
  userId: string,
  userRole: string
) {
  logger.debug('Creating classroom', {
    userId,
    userRole,
    numero: data.numero,
    collegeId: data.collegeId,
    departementId: data.departementId,
  });

  // Verify college exists
  const college = await prisma.colleges.findUnique({
    where: { id: data.collegeId },
  });

  if (!college) {
    throw new NotFoundError('Collège introuvable');
  }

  // Verify department exists and belongs to the college if provided
  if (data.departementId) {
    const departement = await prisma.departements.findUnique({
      where: { id: data.departementId },
      select: { id: true, collegeId: true, nom: true },
    });

    if (!departement) {
      throw new NotFoundError('Département introuvable');
    }

    if (departement.collegeId !== data.collegeId) {
      throw new BadRequestError('Le département ne fait pas partie de ce collège');
    }

    // Check that the department doesn't already have a salle (1-to-1 constraint)
    const existingSalle = await prisma.salles.findFirst({
      where: { departementId: data.departementId },
      select: { id: true, numero: true },
    });

    if (existingSalle) {
      throw new ConflictError(
        `Le département "${departement.nom}" a déjà une salle (Salle ${existingSalle.numero}). Un département ne peut avoir qu'une seule salle.`
      );
    }
  }

  // Check if ADMIN_COLLEGE is trying to create classroom for their college
  if (userRole === 'ADMIN_COLLEGE') {
    const adminCollege = await prisma.admin_colleges.findUnique({
      where: { userId },
      select: { collegeId: true },
    });

    if (!adminCollege || adminCollege.collegeId !== data.collegeId) {
      logger.access(userId, 'Salle', 'CREATE', false, 'College mismatch');
      throw new ForbiddenError('Vous ne pouvez créer des salles que pour votre collège');
    }
  }

  // Check for duplicate numero within the same college
  const existingSalle = await prisma.salles.findFirst({
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

  const salle = await prisma.salles.create({
    data: {
      numero: data.numero,
      nbPlaces: data.nbPlaces,
      collegeId: data.collegeId,
      departementId: data.departementId || null,
    },
    include: {
      college: {
        select: { id: true, nom: true },
      },
      departement: {
        select: { id: true, nom: true },
      },
    },
  });

  logger.crud('CREATE', 'Salle', userId, salle.id, {
    numero: salle.numero,
    nbPlaces: salle.nbPlaces,
    collegeId: salle.collegeId,
    departementId: salle.departementId,
  });

  logger.info(`Classroom created: ${salle.numero}`, {
    salleId: salle.id,
    collegeId: salle.collegeId,
    departementId: salle.departementId,
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
    departementId?: string | null;
  },
  userId: string,
  userRole: string
) {
  logger.debug('Updating classroom', { id, userId, userRole });

  const salle = await prisma.salles.findUnique({
    where: { id },
    select: { id: true, collegeId: true, numero: true },
  });

  if (!salle) {
    throw new NotFoundError('Salle introuvable');
  }

  // Verify department exists and belongs to the college if provided
  if (data.departementId !== undefined && data.departementId !== null) {
    const departement = await prisma.departements.findUnique({
      where: { id: data.departementId },
      select: { id: true, collegeId: true, nom: true },
    });

    if (!departement) {
      throw new NotFoundError('Département introuvable');
    }

    if (departement.collegeId !== salle.collegeId) {
      throw new BadRequestError('Le département ne fait pas partie de ce collège');
    }

    // Check that no OTHER salle exists for this department (1-to-1 constraint)
    const existingSalle = await prisma.salles.findFirst({
      where: {
        departementId: data.departementId,
        id: { not: id }, // Exclude the current salle being updated
      },
      select: { id: true, numero: true },
    });

    if (existingSalle) {
      throw new ConflictError(
        `Le département "${departement.nom}" a déjà une salle (Salle ${existingSalle.numero}). Un département ne peut avoir qu'une seule salle.`
      );
    }
  }

  // Check access for ADMIN_COLLEGE
  if (userRole === 'ADMIN_COLLEGE') {
    const adminCollege = await prisma.admin_colleges.findUnique({
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
    const existingSalle = await prisma.salles.findFirst({
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

  const updated = await prisma.salles.update({
    where: { id },
    data: {
      numero: data.numero,
      nbPlaces: data.nbPlaces,
      departementId: data.departementId !== undefined ? data.departementId : undefined,
    },
    include: {
      college: {
        select: { id: true, nom: true },
      },
      departement: {
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

  const salle = await prisma.salles.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          matieres: true,
          inscriptions: true,
        },
      },
    },
  });

  if (!salle) {
    throw new NotFoundError('Salle introuvable');
  }

  // Check access for ADMIN_COLLEGE
  if (userRole === 'ADMIN_COLLEGE') {
    const adminCollege = await prisma.admin_colleges.findUnique({
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

  // Check for associated inscriptions
  if (salle._count.inscriptions > 0) {
    logger.warn('Cannot delete classroom with inscriptions', {
      id,
      inscriptionCount: salle._count.inscriptions,
    });
    throw new BadRequestError(
      `Impossible de supprimer: ${salle._count.inscriptions} inscription(s) associée(s)`
    );
  }

  await prisma.salles.delete({
    where: { id },
  });

  logger.crud('DELETE', 'Salle', userId, id);
  logger.info('Classroom deleted', { salleId: id, userId });

  return { message: 'Salle supprimée avec succès' };
}
