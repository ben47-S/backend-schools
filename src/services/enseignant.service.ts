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
    const enseignants = await prisma.enseignants.findMany({
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
        departement: {
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
    const adminCollege = await prisma.admin_colleges.findUnique({
      where: { userId },
      select: { collegeId: true },
    });

    if (!adminCollege) {
      logger.warn('Admin college configuration not found', { userId });
      throw new NotFoundError('Configuration administrateur introuvable');
    }

    // Get teachers who have departments in this college
    const enseignants = await prisma.enseignants.findMany({
      where: {
        enseignant_departements: {
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
        enseignant_departements: {
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

  const enseignant = await prisma.enseignants.findUnique({
    where: { id },
    include: {
      users: {
        select: { id: true, email: true, photoUrl: true, isActive: true, createdAt: true },
      },
      matieres: {
        select: {
          id: true,
          nom: true,
          departement: {
            select: { id: true, nom: true, collegeId: true },
          },
        },
      },
      enseignant_departements: {
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
    const adminCollege = await prisma.admin_colleges.findUnique({
      where: { userId },
      select: { collegeId: true },
    });

    if (!adminCollege) {
      throw new NotFoundError('Configuration administrateur introuvable');
    }

    // Check if teacher has at least one department in this college
    const hasAccess = enseignant.enseignant_departements.some(
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
  const user = await prisma.users.findUnique({
    where: { id: data.userId },
  });

  if (!user) {
    throw new NotFoundError('Utilisateur introuvable');
  }

  if (user.role !== 'ENSEIGNANT') {
    throw new BadRequestError('L\'utilisateur doit avoir le rôle ENSEIGNANT');
  }

  // Check if teacher already exists for this user
  const existingEnseignant = await prisma.enseignants.findUnique({
    where: { userId: data.userId },
  });

  if (existingEnseignant) {
    logger.warn('Teacher already exists for user', { userId: data.userId });
    throw new ConflictError('Cet utilisateur est déjà enregistré comme enseignant');
  }

  // Verify matiere exists if provided
  if (data.matiereId) {
    const matiere = await prisma.matieres.findUnique({
      where: { id: data.matiereId },
    });

    if (!matiere) {
      throw new NotFoundError('Matière introuvable');
    }
  }

  const enseignant = await prisma.enseignants.create({
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
      users: {
        select: { id: true, email: true, isActive: true },
      },
      matieres: {
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

  const enseignant = await prisma.enseignants.findUnique({
    where: { id },
    include: {
      enseignant_departements: {
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
    const adminCollege = await prisma.admin_colleges.findUnique({
      where: { userId: requestUserId },
      select: { collegeId: true },
    });

    if (!adminCollege) {
      throw new NotFoundError('Configuration administrateur introuvable');
    }

    const hasAccess = enseignant.enseignant_departements.some(
      (ed) => ed.departement.collegeId === adminCollege.collegeId
    );

    if (!hasAccess) {
      logger.access(requestUserId, 'Enseignant', 'UPDATE', false, 'No department in college');
      throw new ForbiddenError('Accès non autorisé à cet enseignant');
    }
  }

  // Verify matiere if provided
  if (data.matiereId !== undefined && data.matiereId !== null) {
    const matiere = await prisma.matieres.findUnique({
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

  const updated = await prisma.enseignants.update({
    where: { id },
    data: updateData,
    include: {
      users: {
        select: { id: true, email: true, isActive: true },
      },
      matieres: {
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

  const enseignant = await prisma.enseignants.findUnique({
    where: { id },
    include: {
      enseignant_departements: {
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
    const adminCollege = await prisma.admin_colleges.findUnique({
      where: { userId: requestUserId },
      select: { collegeId: true },
    });

    if (!adminCollege) {
      throw new NotFoundError('Configuration administrateur introuvable');
    }

    const hasAccess = enseignant.enseignant_departements.some(
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

  await prisma.enseignants.delete({
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
  const enseignant = await prisma.enseignants.findUnique({
    where: { id: enseignantId },
  });

  if (!enseignant) {
    throw new NotFoundError('Enseignant introuvable');
  }

  // Verify department exists and get college
  const departement = await prisma.departements.findUnique({
    where: { id: data.departementId },
    select: { id: true, collegeId: true },
  });

  if (!departement) {
    throw new NotFoundError('Département introuvable');
  }

  // Check access for ADMIN_COLLEGE
  if (userRole === 'ADMIN_COLLEGE') {
    const adminCollege = await prisma.admin_colleges.findUnique({
      where: { userId: requestUserId },
      select: { collegeId: true },
    });

    if (!adminCollege || adminCollege.collegeId !== departement.collegeId) {
      logger.access(requestUserId, 'EnseignantDepartement', 'CREATE', false, 'College mismatch');
      throw new ForbiddenError('Accès non autorisé à ce département');
    }
  }

  // Verify academic year exists
  const annee = await prisma.annees_scolaires.findUnique({
    where: { id: data.anneeScolaireId },
  });

  if (!annee) {
    throw new NotFoundError('Année scolaire introuvable');
  }

  // Check if assignment already exists
  const existing = await prisma.enseignant_departements.findUnique({
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

  const assignment = await prisma.enseignant_departements.create({
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
  const assignment = await prisma.enseignant_departements.findUnique({
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
    const adminCollege = await prisma.admin_colleges.findUnique({
      where: { userId: requestUserId },
      select: { collegeId: true },
    });

    if (!adminCollege || adminCollege.collegeId !== assignment.departement.collegeId) {
      logger.access(requestUserId, 'EnseignantDepartement', 'DELETE', false, 'College mismatch');
      throw new ForbiddenError('Accès non autorisé à cette affectation');
    }
  }

  await prisma.enseignant_departements.delete({
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

/**
 * Get current teacher profile
 * Used by teacher to see their own profile and demands
 * Returns formatted response for frontend with affectations and demandesEnAttente
 */
export async function getEnseignantMe(userId: string) {
  logger.debug('Getting teacher profile', { userId });

  const enseignant = await prisma.enseignants.findUnique({
    where: { userId },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          role: true,
          isActive: true,
          createdAt: true,
        },
      },
      enseignant_departements: {
        include: {
          departement: {
            select: {
              id: true,
              nom: true,
              college: { select: { id: true, nom: true } },
            },
          },
          anneeScolaire: {
            select: { id: true, libelle: true, estActive: true },
          },
        },
      },
      enseignant_demandes: {
        include: {
          departement: {
            select: {
              id: true,
              nom: true,
              college: { select: { id: true, nom: true } },
            },
          },
          anneeScolaire: {
            select: { id: true, libelle: true },
          },
        },
      },
    },
  });

  if (!enseignant) {
    throw new NotFoundError('Profil enseignant introuvable');
  }

  // Format response to match frontend expectations
  // Always return arrays (empty if no data)
  return {
    enseignant: {
      id: enseignant.id,
      userId: enseignant.userId,
      nom: enseignant.nom,
      prenom: enseignant.prenom,
      telephone: enseignant.telephone,
      datePriseFonction: enseignant.datePriseFonction,
      indice: enseignant.indice,
      createdAt: enseignant.createdAt,
      updatedAt: enseignant.updatedAt,
    },
    user: enseignant.user,
    affectations: enseignant.enseignant_departements || [],
    demandesEnAttente: (enseignant.enseignant_demandes || []).filter(
      (d) => d.statut === 'EN_ATTENTE'
    ),
  };
}

/**
 * Get current teacher's demands
 */
export async function getMesDemandes(userId: string) {
  logger.debug('Getting teacher demands', { userId });

  const enseignant = await prisma.enseignants.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!enseignant) {
    throw new NotFoundError('Profil enseignant introuvable');
  }

  const demandes = await prisma.enseignant_demandes.findMany({
    where: { enseignantId: enseignant.id },
    include: {
      departement: {
        select: {
          id: true,
          nom: true,
          college: { select: { id: true, nom: true } },
        },
      },
      anneeScolaire: {
        select: {
          id: true,
          libelle: true,
          estActive: true,
          dateDebut: true,
          dateFin: true,
        },
      },
    },
    orderBy: { dateCreation: 'desc' },
  });

  return demandes;
}

/**
 * Create a demand for a teacher (Admin sends demand)
 */
export async function createDemande(
  enseignantId: string,
  data: any,
  requestUserId: string,
  userRole: string
) {
  logger.debug('Creating teacher demand', { enseignantId, requestUserId });

  // Verify user is admin
  if (userRole !== 'ADMIN_GLOBAL' && userRole !== 'ADMIN_COLLEGE') {
    throw new ForbiddenError('Seul un administrateur peut créer une demande');
  }

  // Verify teacher exists
  const enseignant = await prisma.enseignants.findUnique({
    where: { id: enseignantId },
    select: { id: true, nom: true, prenom: true },
  });

  if (!enseignant) {
    throw new NotFoundError('Enseignant introuvable');
  }

  // Verify department exists
  const departement = await prisma.departements.findUnique({
    where: { id: data.departementId },
    select: { id: true, nom: true, collegeId: true },
  });

  if (!departement) {
    throw new NotFoundError('Département introuvable');
  }

  // Check college access for ADMIN_COLLEGE
  if (userRole === 'ADMIN_COLLEGE') {
    const adminCollege = await prisma.admin_colleges.findUnique({
      where: { userId: requestUserId },
      select: { collegeId: true },
    });

    if (!adminCollege || adminCollege.collegeId !== departement.collegeId) {
      throw new ForbiddenError('Accès non autorisé à ce département');
    }
  }

  // Verify academic year exists
  const anneeScolaire = await prisma.annees_scolaires.findUnique({
    where: { id: data.anneeScolaireId },
    select: { id: true, libelle: true },
  });

  if (!anneeScolaire) {
    throw new NotFoundError('Année scolaire introuvable');
  }

  // Check if demand already exists
  const existingDemande = await prisma.enseignant_demandes.findUnique({
    where: {
      enseignantId_departementId_anneeScolaireId: {
        enseignantId,
        departementId: data.departementId,
        anneeScolaireId: data.anneeScolaireId,
      },
    },
  });

  if (existingDemande) {
    throw new ConflictError(
      `Une demande existe déjà pour cet enseignant pour ce département pour cette année (Statut: ${existingDemande.statut})`
    );
  }

  // Create demand
  const demande = await prisma.enseignant_demandes.create({
    data: {
      enseignantId,
      departementId: data.departementId,
      anneeScolaireId: data.anneeScolaireId,
      statut: 'EN_ATTENTE',
    },
    include: {
      departement: { select: { nom: true, college: { select: { nom: true } } } },
      anneeScolaire: { select: { libelle: true } },
    },
  });

  logger.info('Teacher demand created', {
    demandeId: demande.id,
    enseignantId,
    departementId: data.departementId,
  });

  return demande;
}

/**
 * Teacher responds to a demand (accept or refuse)
 */
export async function repondreDemande(
  enseignantId: string,
  demandeId: string,
  data: any,
  userId: string
) {
  logger.debug('Teacher responding to demand', { enseignantId, demandeId, userId });

  // Get enseignant to verify teacher account
  const enseignant = await prisma.enseignants.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!enseignant || enseignant.id !== enseignantId) {
    throw new ForbiddenError('Vous ne pouvez répondre qu\'à vos propres demandes');
  }

  // Get demand
  const demande = await prisma.enseignant_demandes.findUnique({
    where: { id: demandeId },
    include: {
      departement: { select: { id: true, collegeId: true } },
      anneeScolaire: { select: { id: true } },
    },
  });

  if (!demande) {
    throw new NotFoundError('Demande introuvable');
  }

  if (demande.statut !== 'EN_ATTENTE') {
    throw new BadRequestError(`Cannot respond to a demand with status ${demande.statut}`);
  }

  // If accepting, create the assignment
  if (data.statut === 'ACCEPTE') {
    await prisma.$transaction(async (tx) => {
      // Update demand status
      await tx.enseignant_demandes.update({
        where: { id: demandeId },
        data: {
          statut: 'ACCEPTE',
          dateReponse: new Date(),
        },
      });

      // Create the assignment
      await tx.enseignant_departements.create({
        data: {
          enseignantId,
          departementId: demande.departement.id,
          anneeScolaireId: demande.anneeScolaire.id,
          estResponsable: false,
        },
      });
    });

    logger.info('Teacher accepted demand', { demandeId, enseignantId });
  } else if (data.statut === 'REFUSE') {
    // Just update status to REFUSE
    await prisma.enseignant_demandes.update({
      where: { id: demandeId },
      data: {
        statut: 'REFUSE',
        dateReponse: new Date(),
      },
    });

    logger.info('Teacher refused demand', { demandeId, enseignantId });
  }

  const updatedDemande = await prisma.enseignant_demandes.findUnique({
    where: { id: demandeId },
    include: {
      departement: { select: { nom: true } },
      anneeScolaire: { select: { libelle: true } },
    },
  });

  return updatedDemande;
}

/**
 * Get all demands for a teacher
 */
export async function getDemandesForTeacher(
  enseignantId: string,
  requestUserId: string,
  userRole: string
) {
  logger.debug('Getting demands for teacher', { enseignantId, requestUserId });

  // Only allow admin or the teacher themselves to see their demands
  if (userRole !== 'ADMIN_GLOBAL' && userRole !== 'ADMIN_COLLEGE') {
    const enseignant = await prisma.enseignants.findUnique({
      where: { userId: requestUserId },
      select: { id: true },
    });

    if (!enseignant || enseignant.id !== enseignantId) {
      throw new ForbiddenError('Accès non autorisé');
    }
  }

  const demandes = await prisma.enseignant_demandes.findMany({
    where: { enseignantId },
    include: {
      departement: {
        select: {
          id: true,
          nom: true,
          college: { select: { id: true, nom: true } },
        },
      },
      anneeScolaire: {
        select: { id: true, libelle: true, estActive: true },
      },
    },
    orderBy: { dateCreation: 'desc' },
  });

  return demandes;
}
