/**
 * Enseignant Service
 * Business logic for teacher management with college isolation
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
 * Get all teachers (with college isolation through departments)
 * - ADMIN_GLOBAL: sees all teachers
 * - ADMIN_COLLEGE: sees only teachers from their college's departments
 */
export async function getAllEnseignants(userId: string, userRole: string) {
  logger.debug('Fetching all teachers', { userId, userRole });

  if (userRole === 'ADMIN_GLOBAL') {
    const enseignants = await prisma.enseignant.findMany({
      include: {
        user: {
          select: { id: true, email: true, isActive: true },
        },
        matiere: {
          select: {
            id: true,
            nom: true,
            departement: {
              select: { id: true, nom: true, collegeId: true },
            },
          },
        },
        departements: {
          include: {
            departement: {
              select: { id: true, nom: true, collegeId: true },
            },
            anneeScolaire: {
              select: { id: true, libelle: true },
            },
          },
        },
      },
      orderBy: [{ nom: 'asc' }, { prenom: 'asc' }],
    });

    logger.crud('READ', 'Enseignant', userId, undefined, {
      count: enseignants.length,
      filter: 'all',
    });

    return enseignants;
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

    // Get teachers who have departments in this college
    const enseignants = await prisma.enseignant.findMany({
      where: {
        departements: {
          some: {
            departement: {
              collegeId: adminCollege.collegeId,
            },
          },
        },
      },
      include: {
        user: {
          select: { id: true, email: true, isActive: true },
        },
        matiere: {
          select: {
            id: true,
            nom: true,
            departement: {
              select: { id: true, nom: true, collegeId: true },
            },
          },
        },
        departements: {
          where: {
            departement: {
              collegeId: adminCollege.collegeId,
            },
          },
          include: {
            departement: {
              select: { id: true, nom: true, collegeId: true },
            },
            anneeScolaire: {
              select: { id: true, libelle: true },
            },
          },
        },
      },
      orderBy: [{ nom: 'asc' }, { prenom: 'asc' }],
    });

    logger.crud('READ', 'Enseignant', userId, undefined, {
      count: enseignants.length,
      filter: 'college',
      collegeId: adminCollege.collegeId,
    });

    return enseignants;
  }

  logger.access(userId, 'Enseignant', 'READ_ALL', false, `Insufficient role: ${userRole}`);
  throw new ForbiddenError('Permissions insuffisantes pour voir les enseignants');
}

/**
 * Get a single teacher by ID
 */
export async function getEnseignantById(
  id: string,
  userId: string,
  userRole: string
) {
  logger.debug('Fetching teacher by ID', { id, userId, userRole });

  const enseignant = await prisma.enseignant.findUnique({
    where: { id },
    include: {
      user: {
        select: { id: true, email: true, photoUrl: true, isActive: true, createdAt: true },
      },
      matiere: {
        select: {
          id: true,
          nom: true,
          departement: {
            select: { id: true, nom: true, collegeId: true },
          },
        },
      },
      departements: {
        include: {
          departement: {
            select: {
              id: true,
              nom: true,
              collegeId: true,
              college: { select: { id: true, nom: true } },
            },
          },
          anneeScolaire: {
            select: { id: true, libelle: true, estActive: true },
          },
        },
      },
      _count: {
        select: {
          cours: true,
        },
      },
    },
  });

  if (!enseignant) {
    logger.warn('Teacher not found', { id });
    throw new NotFoundError('Enseignant introuvable');
  }

  // Check access for ADMIN_COLLEGE
  if (userRole === 'ADMIN_COLLEGE') {
    const adminCollege = await prisma.adminCollege.findUnique({
      where: { userId },
      select: { collegeId: true },
    });

    if (!adminCollege) {
      throw new NotFoundError('Configuration administrateur introuvable');
    }

    // Check if teacher has at least one department in this college
    const hasAccess = enseignant.departements.some(
      (ed) => ed.departement.collegeId === adminCollege.collegeId
    );

    if (!hasAccess) {
      logger.access(userId, 'Enseignant', 'READ', false, 'No department in college');
      throw new ForbiddenError('Accès non autorisé à cet enseignant');
    }
  }

  logger.crud('READ', 'Enseignant', userId, id);

  return enseignant;
}

/**
 * Create a new teacher
 */
export async function createEnseignant(
  data: {
    userId: string;
    nom: string;
    prenom: string;
    telephone?: string | null;
    datePriseFonction: string;
    indice: number;
    matiereId?: string | null;
  },
  requestUserId: string,
  userRole: string
) {
  logger.debug('Creating teacher', {
    requestUserId,
    userRole,
    userId: data.userId,
    nom: data.nom,
    prenom: data.prenom,
  });

  // Verify user exists and has ENSEIGNANT role
  const user = await prisma.user.findUnique({
    where: { id: data.userId },
  });

  if (!user) {
    throw new NotFoundError('Utilisateur introuvable');
  }

  if (user.role !== 'ENSEIGNANT') {
    throw new BadRequestError('L\'utilisateur doit avoir le rôle ENSEIGNANT');
  }

  // Check if teacher already exists for this user
  const existingEnseignant = await prisma.enseignant.findUnique({
    where: { userId: data.userId },
  });

  if (existingEnseignant) {
    logger.warn('Teacher already exists for user', { userId: data.userId });
    throw new ConflictError('Cet utilisateur est déjà enregistré comme enseignant');
  }

  // Verify matiere exists if provided
  if (data.matiereId) {
    const matiere = await prisma.matiere.findUnique({
      where: { id: data.matiereId },
    });

    if (!matiere) {
      throw new NotFoundError('Matière introuvable');
    }
  }

  const enseignant = await prisma.enseignant.create({
    data: {
      userId: data.userId,
      nom: data.nom,
      prenom: data.prenom,
      telephone: data.telephone,
      datePriseFonction: new Date(data.datePriseFonction),
      indice: data.indice,
      matiereId: data.matiereId,
    },
    include: {
      user: {
        select: { id: true, email: true, isActive: true },
      },
      matiere: {
        select: { id: true, nom: true },
      },
    },
  });

  logger.crud('CREATE', 'Enseignant', requestUserId, enseignant.id, {
    nom: enseignant.nom,
    prenom: enseignant.prenom,
    userId: enseignant.userId,
  });

  logger.info(`Teacher created: ${enseignant.prenom} ${enseignant.nom}`, {
    enseignantId: enseignant.id,
    userId: requestUserId,
  });

  return enseignant;
}

/**
 * Update a teacher
 */
export async function updateEnseignant(
  id: string,
  data: {
    nom?: string;
    prenom?: string;
    telephone?: string | null;
    datePriseFonction?: string;
    indice?: number;
    matiereId?: string | null;
  },
  requestUserId: string,
  userRole: string
) {
  logger.debug('Updating teacher', { id, requestUserId, userRole });

  const enseignant = await prisma.enseignant.findUnique({
    where: { id },
    include: {
      departements: {
        include: {
          departement: { select: { collegeId: true } },
        },
      },
    },
  });

  if (!enseignant) {
    throw new NotFoundError('Enseignant introuvable');
  }

  // Check access for ADMIN_COLLEGE
  if (userRole === 'ADMIN_COLLEGE') {
    const adminCollege = await prisma.adminCollege.findUnique({
      where: { userId: requestUserId },
      select: { collegeId: true },
    });

    if (!adminCollege) {
      throw new NotFoundError('Configuration administrateur introuvable');
    }

    const hasAccess = enseignant.departements.some(
      (ed) => ed.departement.collegeId === adminCollege.collegeId
    );

    if (!hasAccess) {
      logger.access(requestUserId, 'Enseignant', 'UPDATE', false, 'No department in college');
      throw new ForbiddenError('Accès non autorisé à cet enseignant');
    }
  }

  // Verify matiere if provided
  if (data.matiereId !== undefined && data.matiereId !== null) {
    const matiere = await prisma.matiere.findUnique({
      where: { id: data.matiereId },
    });

    if (!matiere) {
      throw new NotFoundError('Matière introuvable');
    }
  }

  const updateData: any = {};
  if (data.nom !== undefined) updateData.nom = data.nom;
  if (data.prenom !== undefined) updateData.prenom = data.prenom;
  if (data.telephone !== undefined) updateData.telephone = data.telephone;
  if (data.datePriseFonction !== undefined)
    updateData.datePriseFonction = new Date(data.datePriseFonction);
  if (data.indice !== undefined) updateData.indice = data.indice;
  if (data.matiereId !== undefined) updateData.matiereId = data.matiereId;

  const updated = await prisma.enseignant.update({
    where: { id },
    data: updateData,
    include: {
      user: {
        select: { id: true, email: true, isActive: true },
      },
      matiere: {
        select: { id: true, nom: true },
      },
    },
  });

  logger.crud('UPDATE', 'Enseignant', requestUserId, id, {
    changes: data,
  });

  logger.info(`Teacher updated: ${updated.prenom} ${updated.nom}`, {
    enseignantId: id,
    userId: requestUserId,
  });

  return updated;
}

/**
 * Delete a teacher
 * Only allowed if no courses are associated
 */
export async function deleteEnseignant(
  id: string,
  requestUserId: string,
  userRole: string
) {
  logger.debug('Deleting teacher', { id, requestUserId, userRole });

  const enseignant = await prisma.enseignant.findUnique({
    where: { id },
    include: {
      departements: {
        include: {
          departement: { select: { collegeId: true } },
        },
      },
      _count: {
        select: {
          cours: true,
        },
      },
    },
  });

  if (!enseignant) {
    throw new NotFoundError('Enseignant introuvable');
  }

  // Check access for ADMIN_COLLEGE
  if (userRole === 'ADMIN_COLLEGE') {
    const adminCollege = await prisma.adminCollege.findUnique({
      where: { userId: requestUserId },
      select: { collegeId: true },
    });

    if (!adminCollege) {
      throw new NotFoundError('Configuration administrateur introuvable');
    }

    const hasAccess = enseignant.departements.some(
      (ed) => ed.departement.collegeId === adminCollege.collegeId
    );

    if (!hasAccess) {
      logger.access(requestUserId, 'Enseignant', 'DELETE', false, 'No department in college');
      throw new ForbiddenError('Accès non autorisé à cet enseignant');
    }
  }

  // Check for associated courses
  if (enseignant._count.cours > 0) {
    logger.warn('Cannot delete teacher with courses', {
      id,
      courseCount: enseignant._count.cours,
    });
    throw new BadRequestError(
      `Impossible de supprimer: ${enseignant._count.cours} cours associé(s)`
    );
  }

  await prisma.enseignant.delete({
    where: { id },
  });

  logger.crud('DELETE', 'Enseignant', requestUserId, id);
  logger.info('Teacher deleted', { enseignantId: id, userId: requestUserId });

  return { message: 'Enseignant supprimé avec succès' };
}

/**
 * Assign teacher to department
 */
export async function assignDepartement(
  enseignantId: string,
  data: {
    departementId: string;
    anneeScolaireId: string;
    estResponsable?: boolean;
  },
  requestUserId: string,
  userRole: string
) {
  logger.debug('Assigning teacher to department', {
    enseignantId,
    departementId: data.departementId,
    anneeScolaireId: data.anneeScolaireId,
    requestUserId,
    userRole,
  });

  // Verify teacher exists
  const enseignant = await prisma.enseignant.findUnique({
    where: { id: enseignantId },
  });

  if (!enseignant) {
    throw new NotFoundError('Enseignant introuvable');
  }

  // Verify department exists and get college
  const departement = await prisma.departement.findUnique({
    where: { id: data.departementId },
    select: { id: true, collegeId: true },
  });

  if (!departement) {
    throw new NotFoundError('Département introuvable');
  }

  // Check access for ADMIN_COLLEGE
  if (userRole === 'ADMIN_COLLEGE') {
    const adminCollege = await prisma.adminCollege.findUnique({
      where: { userId: requestUserId },
      select: { collegeId: true },
    });

    if (!adminCollege || adminCollege.collegeId !== departement.collegeId) {
      logger.access(requestUserId, 'EnseignantDepartement', 'CREATE', false, 'College mismatch');
      throw new ForbiddenError('Accès non autorisé à ce département');
    }
  }

  // Verify academic year exists
  const annee = await prisma.anneeScolaire.findUnique({
    where: { id: data.anneeScolaireId },
  });

  if (!annee) {
    throw new NotFoundError('Année scolaire introuvable');
  }

  // Check if assignment already exists
  const existing = await prisma.enseignantDepartement.findUnique({
    where: {
      enseignantId_departementId_anneeScolaireId: {
        enseignantId,
        departementId: data.departementId,
        anneeScolaireId: data.anneeScolaireId,
      },
    },
  });

  if (existing) {
    logger.warn('Teacher already assigned to this department for this year', {
      enseignantId,
      departementId: data.departementId,
      anneeScolaireId: data.anneeScolaireId,
    });
    throw new ConflictError('L\'enseignant est déjà affecté à ce département pour cette année');
  }

  const assignment = await prisma.enseignantDepartement.create({
    data: {
      enseignantId,
      departementId: data.departementId,
      anneeScolaireId: data.anneeScolaireId,
      estResponsable: data.estResponsable || false,
    },
    include: {
      departement: {
        select: { id: true, nom: true },
      },
      anneeScolaire: {
        select: { id: true, libelle: true },
      },
    },
  });

  logger.crud('CREATE', 'EnseignantDepartement', requestUserId, assignment.id, {
    enseignantId,
    departementId: data.departementId,
    anneeScolaireId: data.anneeScolaireId,
    estResponsable: assignment.estResponsable,
  });

  logger.info('Teacher assigned to department', {
    enseignantId,
    departementId: data.departementId,
    anneeScolaireId: data.anneeScolaireId,
    userId: requestUserId,
  });

  return assignment;
}

/**
 * Remove teacher from department
 */
export async function removeDepartement(
  enseignantId: string,
  data: {
    departementId: string;
    anneeScolaireId: string;
  },
  requestUserId: string,
  userRole: string
) {
  logger.debug('Removing teacher from department', {
    enseignantId,
    departementId: data.departementId,
    anneeScolaireId: data.anneeScolaireId,
    requestUserId,
    userRole,
  });

  // Verify assignment exists
  const assignment = await prisma.enseignantDepartement.findUnique({
    where: {
      enseignantId_departementId_anneeScolaireId: {
        enseignantId,
        departementId: data.departementId,
        anneeScolaireId: data.anneeScolaireId,
      },
    },
    include: {
      departement: { select: { collegeId: true } },
    },
  });

  if (!assignment) {
    throw new NotFoundError('Affectation introuvable');
  }

  // Check access for ADMIN_COLLEGE
  if (userRole === 'ADMIN_COLLEGE') {
    const adminCollege = await prisma.adminCollege.findUnique({
      where: { userId: requestUserId },
      select: { collegeId: true },
    });

    if (!adminCollege || adminCollege.collegeId !== assignment.departement.collegeId) {
      logger.access(requestUserId, 'EnseignantDepartement', 'DELETE', false, 'College mismatch');
      throw new ForbiddenError('Accès non autorisé à cette affectation');
    }
  }

  await prisma.enseignantDepartement.delete({
    where: {
      enseignantId_departementId_anneeScolaireId: {
        enseignantId,
        departementId: data.departementId,
        anneeScolaireId: data.anneeScolaireId,
      },
    },
  });

  logger.crud('DELETE', 'EnseignantDepartement', requestUserId, assignment.id);
  logger.info('Teacher removed from department', {
    enseignantId,
    departementId: data.departementId,
    anneeScolaireId: data.anneeScolaireId,
    userId: requestUserId,
  });

  return { message: 'Affectation supprimée avec succès' };
}
