/**
 * Matiere Service
 * Business logic for subject management with college isolation
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
 * Get all subjects (with college isolation through department)
 * - ADMIN_GLOBAL: sees all subjects
 * - ADMIN_COLLEGE: sees only subjects from their college's departments
 */
export async function getAllMatieres(userId: string, userRole: string) {
  logger.debug('Fetching all subjects', { userId, userRole });

  if (userRole === 'ADMIN_GLOBAL') {
    const matieres = await prisma.matieres.findMany({
      include: {
        departement: {
          select: {
            id: true,
            nom: true,
            collegeId: true,
            college: {
              select: { id: true, nom: true },
            },
          },
        },
        salle: {
          select: { id: true, numero: true, nbPlaces: true },
        },
        _count: {
          select: {
            enseignants: true,
            notes: true,
            cours: true,
          },
        },
      },
      orderBy: [{ departement: { college: { nom: 'asc' } } }, { nom: 'asc' }],
    });

    logger.crud('READ', 'Matiere', userId, undefined, {
      count: matieres.length,
      filter: 'all',
    });

    return matieres;
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

    const matieres = await prisma.matieres.findMany({
      where: {
        departement: {
          collegeId: adminCollege.collegeId,
        },
      },
      include: {
        departement: {
          select: {
            id: true,
            nom: true,
            collegeId: true,
          },
        },
        salle: {
          select: { id: true, numero: true, nbPlaces: true },
        },
        _count: {
          select: {
            enseignants: true,
            notes: true,
            cours: true,
          },
        },
      },
      orderBy: [{ departement: { nom: 'asc' } }, { nom: 'asc' }],
    });

    logger.crud('READ', 'Matiere', userId, undefined, {
      count: matieres.length,
      filter: 'college',
      collegeId: adminCollege.collegeId,
    });

    return matieres;
  }

  logger.access(userId, 'Matiere', 'READ_ALL', false, `Insufficient role: ${userRole}`);
  throw new ForbiddenError('Permissions insuffisantes pour voir les matières');
}

/**
 * Get subjects by department ID
 */
export async function getMatieresByDepartement(
  departementId: string,
  userId: string,
  userRole: string
) {
  logger.debug('Fetching subjects by department', { departementId, userId, userRole });

  // Verify department exists
  const departement = await prisma.departements.findUnique({
    where: { id: departementId },
    select: { id: true, collegeId: true },
  });

  if (!departement) {
    throw new NotFoundError('Département introuvable');
  }

  // Check access rights for ADMIN_COLLEGE
  if (userRole === 'ADMIN_COLLEGE') {
    const adminCollege = await prisma.admin_colleges.findUnique({
      where: { userId },
      select: { collegeId: true },
    });

    if (!adminCollege || adminCollege.collegeId !== departement.collegeId) {
      logger.access(userId, 'Matiere', 'READ_BY_DEPARTMENT', false, 'College mismatch');
      throw new ForbiddenError('Accès non autorisé à ce département');
    }
  }

  const matieres = await prisma.matieres.findMany({
    where: { departementId },
    include: {
      salle: {
        select: { id: true, numero: true, nbPlaces: true },
      },
      _count: {
        select: {
          enseignants: true,
          notes: true,
          cours: true,
        },
      },
    },
    orderBy: { nom: 'asc' },
  });

  logger.crud('READ', 'Matiere', userId, undefined, {
    count: matieres.length,
    departementId,
  });

  return matieres;
}

/**
 * Get a single subject by ID
 */
export async function getMatiereById(
  id: string,
  userId: string,
  userRole: string
) {
  logger.debug('Fetching subject by ID', { id, userId, userRole });

  const matiere = await prisma.matieres.findUnique({
    where: { id },
    include: {
      departement: {
        select: {
          id: true,
          nom: true,
          collegeId: true,
          college: {
            select: { id: true, nom: true, adresse: true, siteWeb: true },
          },
        },
      },
      salle: {
        select: { id: true, numero: true, nbPlaces: true, collegeId: true },
      },
      _count: {
        select: {
          enseignants: true,
          notes: true,
          cours: true,
        },
      },
    },
  });

  if (!matiere) {
    logger.warn('Subject not found', { id });
    throw new NotFoundError('Matière introuvable');
  }

  // Check access for ADMIN_COLLEGE
  if (userRole === 'ADMIN_COLLEGE') {
    const adminCollege = await prisma.admin_colleges.findUnique({
      where: { userId },
      select: { collegeId: true },
    });

    if (!adminCollege || adminCollege.collegeId !== matiere.departements.collegeId) {
      logger.access(userId, 'Matiere', 'READ', false, 'College mismatch');
      throw new ForbiddenError('Accès non autorisé à cette matière');
    }
  }

  logger.crud('READ', 'Matiere', userId, id);

  return matiere;
}

/**
 * Create a new subject
 */
export async function createMatiere(
  data: {
    nom: string;
    departementId: string;
    salleId?: string | null;
  },
  userId: string,
  userRole: string
) {
  logger.debug('Creating subject', {
    userId,
    userRole,
    nom: data.nom,
    departementId: data.departementId,
  });

  // Verify department exists and get college
  const departement = await prisma.departements.findUnique({
    where: { id: data.departementId },
    select: { id: true, collegeId: true },
  });

  if (!departement) {
    throw new NotFoundError('Département introuvable');
  }

  // Check if ADMIN_COLLEGE is trying to create subject for their college
  if (userRole === 'ADMIN_COLLEGE') {
    const adminCollege = await prisma.admin_colleges.findUnique({
      where: { userId },
      select: { collegeId: true },
    });

    if (!adminCollege || adminCollege.collegeId !== departement.collegeId) {
      logger.access(userId, 'Matiere', 'CREATE', false, 'College mismatch');
      throw new ForbiddenError(
        'Vous ne pouvez créer des matières que pour les départements de votre collège'
      );
    }
  }

  // Verify salle exists and belongs to same college if provided
  if (data.salleId) {
    const salle = await prisma.salles.findUnique({
      where: { id: data.salleId },
      select: { id: true, collegeId: true },
    });

    if (!salle) {
      throw new NotFoundError('Salle introuvable');
    }

    if (salle.collegeId !== departement.collegeId) {
      throw new BadRequestError(
        'La salle doit appartenir au même collège que le département'
      );
    }
  }

  // Check for duplicate name within the same department
  const existingMatiere = await prisma.matieres.findFirst({
    where: {
      nom: data.nom,
      departementId: data.departementId,
    },
  });

  if (existingMatiere) {
    logger.warn('Subject name already exists in department', {
      nom: data.nom,
      departementId: data.departementId,
    });
    throw new ConflictError(
      `La matière "${data.nom}" existe déjà dans ce département`
    );
  }

  const matiere = await prisma.matieres.create({
    data: {
      nom: data.nom,
      departementId: data.departementId,
      salleId: data.salleId,
    },
    include: {
      departement: {
        select: { id: true, nom: true, collegeId: true },
      },
      salle: {
        select: { id: true, numero: true, nbPlaces: true },
      },
    },
  });

  logger.crud('CREATE', 'Matiere', userId, matiere.id, {
    nom: matiere.nom,
    departementId: matiere.departementId,
    salleId: matiere.salleId,
  });

  logger.info(`Subject created: ${matiere.nom}`, {
    matiereId: matiere.id,
    departementId: matiere.departementId,
    userId,
  });

  return matiere;
}

/**
 * Update a subject
 */
export async function updateMatiere(
  id: string,
  data: {
    nom?: string;
    salleId?: string | null;
  },
  userId: string,
  userRole: string
) {
  logger.debug('Updating subject', { id, userId, userRole });

  const matiere = await prisma.matieres.findUnique({
    where: { id },
    select: {
      id: true,
      nom: true,
      departementId: true,
      departement: {
        select: { collegeId: true },
      },
    },
  });

  if (!matiere) {
    throw new NotFoundError('Matière introuvable');
  }

  // Check access for ADMIN_COLLEGE
  if (userRole === 'ADMIN_COLLEGE') {
    const adminCollege = await prisma.admin_colleges.findUnique({
      where: { userId },
      select: { collegeId: true },
    });

    if (!adminCollege || adminCollege.collegeId !== matiere.departements.collegeId) {
      logger.access(userId, 'Matiere', 'UPDATE', false, 'College mismatch');
      throw new ForbiddenError('Accès non autorisé à cette matière');
    }
  }

  // Check for duplicate name if name is being updated
  if (data.nom && data.nom !== matiere.nom) {
    const existingMatiere = await prisma.matieres.findFirst({
      where: {
        nom: data.nom,
        departementId: matiere.departementId,
        id: { not: id },
      },
    });

    if (existingMatiere) {
      logger.warn('Subject name already exists in department', {
        nom: data.nom,
        departementId: matiere.departementId,
      });
      throw new ConflictError(
        `La matière "${data.nom}" existe déjà dans ce département`
      );
    }
  }

  // Verify salle exists and belongs to same college if provided
  if (data.salleId) {
    const salle = await prisma.salles.findUnique({
      where: { id: data.salleId },
      select: { id: true, collegeId: true },
    });

    if (!salle) {
      throw new NotFoundError('Salle introuvable');
    }

    if (salle.collegeId !== matiere.departements.collegeId) {
      throw new BadRequestError(
        'La salle doit appartenir au même collège que le département'
      );
    }
  }

  const updated = await prisma.matieres.update({
    where: { id },
    data: {
      nom: data.nom,
      salleId: data.salleId,
    },
    include: {
      departement: {
        select: { id: true, nom: true, collegeId: true },
      },
      salle: {
        select: { id: true, numero: true, nbPlaces: true },
      },
    },
  });

  logger.crud('UPDATE', 'Matiere', userId, id, {
    changes: data,
  });

  logger.info(`Subject updated: ${updated.nom}`, {
    matiereId: id,
    userId,
  });

  return updated;
}

/**
 * Delete a subject
 * Only allowed if no teachers, notes, or courses are associated
 */
export async function deleteMatiere(
  id: string,
  userId: string,
  userRole: string
) {
  logger.debug('Deleting subject', { id, userId, userRole });

  const matiere = await prisma.matieres.findUnique({
    where: { id },
    include: {
      departement: {
        select: { collegeId: true },
      },
      _count: {
        select: {
          enseignants: true,
          notes: true,
          cours: true,
        },
      },
    },
  });

  if (!matiere) {
    throw new NotFoundError('Matière introuvable');
  }

  // Check access for ADMIN_COLLEGE
  if (userRole === 'ADMIN_COLLEGE') {
    const adminCollege = await prisma.admin_colleges.findUnique({
      where: { userId },
      select: { collegeId: true },
    });

    if (!adminCollege || adminCollege.collegeId !== matiere.departements.collegeId) {
      logger.access(userId, 'Matiere', 'DELETE', false, 'College mismatch');
      throw new ForbiddenError('Accès non autorisé à cette matière');
    }
  }

  // Check for associated data
  if (matiere._count.enseignants > 0) {
    logger.warn('Cannot delete subject with teachers', {
      id,
      teacherCount: matiere._count.enseignants,
    });
    throw new BadRequestError(
      `Impossible de supprimer: ${matiere._count.enseignants} enseignant(s) associé(s)`
    );
  }

  if (matiere._count.notes > 0) {
    logger.warn('Cannot delete subject with grades', {
      id,
      gradeCount: matiere._count.notes,
    });
    throw new BadRequestError(
      `Impossible de supprimer: ${matiere._count.notes} note(s) associée(s)`
    );
  }

  if (matiere._count.cours > 0) {
    logger.warn('Cannot delete subject with courses', {
      id,
      courseCount: matiere._count.cours,
    });
    throw new BadRequestError(
      `Impossible de supprimer: ${matiere._count.cours} cours associé(s)`
    );
  }

  await prisma.matieres.delete({
    where: { id },
  });

  logger.crud('DELETE', 'Matiere', userId, id);
  logger.info('Subject deleted', { matiereId: id, userId });

  return { message: 'Matière supprimée avec succès' };
}
