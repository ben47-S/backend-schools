/**
 * Departement Service
 * Business logic for department management with college isolation
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
 * Get all departments (with college isolation)
 * - ADMIN_GLOBAL: sees all departments
 * - ADMIN_COLLEGE: sees only departments from their college
 */
export async function getAllDepartements(userId: string, userRole: string) {
  logger.debug('Fetching all departments', { userId, userRole });

  if (userRole === 'ADMIN_GLOBAL') {
    const departements = await prisma.departements.findMany({
      include: {
        college: {
          select: { id: true, nom: true },
        },
        _count: {
          select: {
            enseignant_departements: true,
            matieres: true,
            salles: true,
          },
        },
      },
      orderBy: [{ college: { nom: 'asc' } }, { nom: 'asc' }],
    });

    logger.crud('READ', 'Departement', userId, undefined, {
      count: departements.length,
      filter: 'all',
    });

    return departements;
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

    const departements = await prisma.departements.findMany({
      where: { collegeId: adminCollege.collegeId },
      include: {
        college: {
          select: { id: true, nom: true },
        },
        _count: {
          select: {
            enseignant_departements: true,
            matieres: true,
            salles: true,
          },
        },
      },
      orderBy: { nom: 'asc' },
    });

    logger.crud('READ', 'Departement', userId, undefined, {
      count: departements.length,
      filter: 'college',
      collegeId: adminCollege.collegeId,
    });

    return departements;
  }

  logger.access(userId, 'Departement', 'READ_ALL', false, `Insufficient role: ${userRole}`);
  throw new ForbiddenError('Permissions insuffisantes pour voir les départements');
}

/**
 * Get departments by college ID
 */
export async function getDepartementsByCollege(
  collegeId: string,
  userId: string,
  userRole: string
) {
  logger.debug('Fetching departments by college', { collegeId, userId, userRole });

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
      logger.access(userId, 'Departement', 'READ_BY_COLLEGE', false, 'College mismatch');
      throw new ForbiddenError('Accès non autorisé à ce collège');
    }
  }

  const departements = await prisma.departements.findMany({
    where: { collegeId },
    include: {
      _count: {
        select: {
          enseignant_departements: true,
          matieres: true,
          salles: true,
        },
      },
    },
    orderBy: { nom: 'asc' },
  });

  logger.crud('READ', 'Departement', userId, undefined, {
    count: departements.length,
    collegeId,
  });

  return departements;
}

/**
 * Get a single department by ID
 */
export async function getDepartementById(
  id: string,
  userId: string,
  userRole: string
) {
  logger.debug('Fetching department by ID', { id, userId, userRole });

  const departement = await prisma.departements.findUnique({
    where: { id },
    include: {
      college: {
        select: { id: true, nom: true, adresse: true, siteWeb: true },
      },
      salles: {
        select: {
          id: true,
          numero: true,
          nbPlaces: true,
        },
      },
      _count: {
        select: {
          enseignant_departements: true,
          matieres: true,
          salles: true,
        },
      },
    },
  });

  if (!departement) {
    logger.warn('Department not found', { id });
    throw new NotFoundError('Département introuvable');
  }

  // Check access for ADMIN_COLLEGE
  if (userRole === 'ADMIN_COLLEGE') {
    const adminCollege = await prisma.admin_colleges.findUnique({
      where: { userId },
      select: { collegeId: true },
    });

    if (!adminCollege || adminCollege.collegeId !== departement.collegeId) {
      logger.access(userId, 'Departement', 'READ', false, 'College mismatch');
      throw new ForbiddenError('Accès non autorisé à ce département');
    }
  }

  logger.crud('READ', 'Departement', userId, id);

  return departement;
}

/**
 * Create a new department
 */
export async function createDepartement(
  data: {
    nom: string;
    collegeId: string;
  },
  userId: string,
  userRole: string
) {
  logger.debug('Creating department', {
    userId,
    userRole,
    nom: data.nom,
    collegeId: data.collegeId,
  });

  // Verify college exists
  const college = await prisma.colleges.findUnique({
    where: { id: data.collegeId },
  });

  if (!college) {
    throw new NotFoundError('Collège introuvable');
  }

  // Check if ADMIN_COLLEGE is trying to create department for their college
  if (userRole === 'ADMIN_COLLEGE') {
    const adminCollege = await prisma.admin_colleges.findUnique({
      where: { userId },
      select: { collegeId: true },
    });

    if (!adminCollege || adminCollege.collegeId !== data.collegeId) {
      logger.access(userId, 'Departement', 'CREATE', false, 'College mismatch');
      throw new ForbiddenError('Vous ne pouvez créer des départements que pour votre collège');
    }
  }

  // Check for duplicate name within the same college
  const existingDepartement = await prisma.departements.findFirst({
    where: {
      nom: data.nom,
      collegeId: data.collegeId,
    },
  });

  if (existingDepartement) {
    logger.warn('Department name already exists in college', {
      nom: data.nom,
      collegeId: data.collegeId,
    });
    throw new ConflictError(
      `Le département "${data.nom}" existe déjà dans ce collège`
    );
  }

  const departement = await prisma.departements.create({
    data: {
      nom: data.nom,
      collegeId: data.collegeId,
    },
    include: {
      college: {
        select: { id: true, nom: true },
      },
    },
  });

  logger.crud('CREATE', 'Departement', userId, departement.id, {
    nom: departement.nom,
    collegeId: departement.collegeId,
  });

  logger.info(`Department created: ${departement.nom}`, {
    departementId: departement.id,
    collegeId: departement.collegeId,
    userId,
  });

  return departement;
}

/**
 * Update a department
 */
export async function updateDepartement(
  id: string,
  data: {
    nom: string;
  },
  userId: string,
  userRole: string
) {
  logger.debug('Updating department', { id, userId, userRole });

  const departement = await prisma.departements.findUnique({
    where: { id },
    select: { id: true, collegeId: true, nom: true },
  });

  if (!departement) {
    throw new NotFoundError('Département introuvable');
  }

  // Check access for ADMIN_COLLEGE
  if (userRole === 'ADMIN_COLLEGE') {
    const adminCollege = await prisma.admin_colleges.findUnique({
      where: { userId },
      select: { collegeId: true },
    });

    if (!adminCollege || adminCollege.collegeId !== departement.collegeId) {
      logger.access(userId, 'Departement', 'UPDATE', false, 'College mismatch');
      throw new ForbiddenError('Accès non autorisé à ce département');
    }
  }

  // Check for duplicate name if name is being updated
  if (data.nom && data.nom !== departement.nom) {
    const existingDepartement = await prisma.departements.findFirst({
      where: {
        nom: data.nom,
        collegeId: departement.collegeId,
        id: { not: id },
      },
    });

    if (existingDepartement) {
      logger.warn('Department name already exists', {
        nom: data.nom,
        collegeId: departement.collegeId,
      });
      throw new ConflictError(`Le département "${data.nom}" existe déjà dans ce collège`);
    }
  }

  const updated = await prisma.departements.update({
    where: { id },
    data: {
      nom: data.nom,
    },
    include: {
      college: {
        select: { id: true, nom: true },
      },
    },
  });

  logger.crud('UPDATE', 'Departement', userId, id, {
    changes: data,
  });

  logger.info(`Department updated: ${updated.nom}`, {
    departementId: id,
    userId,
  });

  return updated;
}

/**
 * Delete a department
 * Only allowed if no teachers or subjects are associated
 */
export async function deleteDepartement(
  id: string,
  userId: string,
  userRole: string
) {
  logger.debug('Deleting department', { id, userId, userRole });

  const departement = await prisma.departements.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          enseignant_departements: true,
          matieres: true,
          salles: true,
        },
      },
    },
  });

  if (!departement) {
    throw new NotFoundError('Département introuvable');
  }

  // Check access for ADMIN_COLLEGE
  if (userRole === 'ADMIN_COLLEGE') {
    const adminCollege = await prisma.admin_colleges.findUnique({
      where: { userId },
      select: { collegeId: true },
    });

    if (!adminCollege || adminCollege.collegeId !== departement.collegeId) {
      logger.access(userId, 'Departement', 'DELETE', false, 'College mismatch');
      throw new ForbiddenError('Accès non autorisé à ce département');
    }
  }

  // Check for associated data
  if (departement._count.enseignant_departements > 0) {
    logger.warn('Cannot delete department with teachers', {
      id,
      teacherCount: departement._count.enseignant_departements,
    });
    throw new BadRequestError(
      `Impossible de supprimer: ${departement._count.enseignant_departements} enseignant(s) associé(s)`
    );
  }

  if (departement._count.matieres > 0) {
    logger.warn('Cannot delete department with subjects', {
      id,
      subjectCount: departement._count.matieres,
    });
    throw new BadRequestError(
      `Impossible de supprimer: ${departement._count.matieres} matière(s) associée(s)`
    );
  }

  await prisma.departements.delete({
    where: { id },
  });

  logger.crud('DELETE', 'Departement', userId, id);
  logger.info(`Department deleted`, { departementId: id, userId });

  return { message: 'Département supprimé avec succès' };
}
