/**
 * Inscription Service
 * Business logic for student enrollment management
 */

import { prisma } from '../lib/prisma';
import { logger } from '../utils/logger';
import {
  NotFoundError,
  ConflictError,
  ForbiddenError,
  BadRequestError,
} from '../utils/errors';
import type {
  CreateInscriptionInput,
  UpdateInscriptionInput,
  InscriptionFilters,
  CreateDemandeInscriptionInput,
  RepondreDemandeInput,
} from '../schemas/inscription.schemas';

/**
 * Get all inscriptions with optional filters
 * ADMIN_GLOBAL: sees all inscriptions
 * ADMIN_COLLEGE: sees only inscriptions in their college
 * Others: see all inscriptions (read-only)
 */
export const getAllInscriptions = async (
  userRole: string,
  userId: string,
  filters: InscriptionFilters = {}
) => {
  // Build where clause based on role and filters
  let whereClause: any = {};

  // Apply role-based filtering
  if (userRole === 'ADMIN_COLLEGE') {
    // Get admin's college
    const adminCollege = await prisma.admin_colleges.findUnique({
      where: { userId },
      select: { collegeId: true },
    });

    if (!adminCollege) {
      throw new ForbiddenError('Admin college record not found');
    }

    whereClause.collegeId = adminCollege.collegeId;
  }

  // Apply user-provided filters
  if (filters.collegeId) {
    // ADMIN_COLLEGE cannot filter on other colleges
    if (userRole === 'ADMIN_COLLEGE' && whereClause.collegeId !== filters.collegeId) {
      throw new ForbiddenError('Vous ne pouvez pas accéder aux inscriptions d\'un autre collège');
    }
    whereClause.collegeId = filters.collegeId;
  }

  if (filters.anneeScolaireId) {
    whereClause.anneeScolaireId = filters.anneeScolaireId;
  }

  if (filters.etudiantId) {
    whereClause.etudiantId = filters.etudiantId;
  }

  const inscriptions = await prisma.inscriptions.findMany({
    where: whereClause,
    include: {
      etudiant: {
        select: {
          id: true,
          nom: true,
          prenom: true,
          telephone: true,
          anneeEntree: true,
        },
      },
      college: {
        select: {
          id: true,
          nom: true,
          adresse: true,
        },
      },
      anneeScolaire: {
        select: {
          id: true,
          libelle: true,
          dateDebut: true,
          dateFin: true,
          estActive: true,
        },
      },
      salle: {
        select: {
          id: true,
          numero: true,
          nbPlaces: true,
          departement: {
            select: {
              id: true,
              nom: true,
            },
          },
        },
      },
    },
    orderBy: [
      { anneeScolaire: { dateDebut: 'desc' } },
      { etudiant: { nom: 'asc' } },
      { etudiant: { prenom: 'asc' } },
    ],
  });

  return inscriptions;
};

/**
 * Get inscription by ID
 */
export const getInscriptionById = async (
  inscriptionId: string,
  userRole: string,
  userId: string
) => {
  const inscription = await prisma.inscriptions.findUnique({
    where: { id: inscriptionId },
    include: {
      etudiant: {
        select: {
          id: true,
          nom: true,
          prenom: true,
          telephone: true,
          anneeEntree: true,
          user: {
            select: {
              id: true,
              email: true,
              isActive: true,
            },
          },
        },
      },
      college: {
        select: {
          id: true,
          nom: true,
          adresse: true,
        },
      },
      anneeScolaire: {
        select: {
          id: true,
          libelle: true,
          dateDebut: true,
          dateFin: true,
          estActive: true,
        },
      },
      salle: {
        select: {
          id: true,
          numero: true,
          nbPlaces: true,
          departement: {
            select: {
              id: true,
              nom: true,
            },
          },
        },
      },
    },
  });

  if (!inscription) {
    throw new NotFoundError('Inscription introuvable');
  }

  // ADMIN_COLLEGE: check if inscription is in their college
  if (userRole === 'ADMIN_COLLEGE') {
    const adminCollege = await prisma.admin_colleges.findUnique({
      where: { userId },
      select: { collegeId: true },
    });

    if (!adminCollege) {
      throw new ForbiddenError('Admin college record not found');
    }

    if (inscription.collegeId !== adminCollege.collegeId) {
      throw new ForbiddenError(
        "Vous n'avez pas accès à cette inscription (pas dans votre collège)"
      );
    }
  }

  return inscription;
};

/**
 * Create a new inscription
 * Requires ADMIN_GLOBAL or ADMIN_COLLEGE
 */
export const createInscription = async (
  data: CreateInscriptionInput,
  userRole: string,
  userId: string
) => {
  // Verify student exists
  const etudiant = await prisma.etudiants.findUnique({
    where: { id: data.etudiantId },
  });

  if (!etudiant) {
    throw new NotFoundError('Étudiant introuvable');
  }

  // Verify college exists
  const college = await prisma.colleges.findUnique({
    where: { id: data.collegeId },
  });

  if (!college) {
    throw new NotFoundError('Collège introuvable');
  }

  // Verify academic year exists
  const anneeScolaire = await prisma.annees_scolaires.findUnique({
    where: { id: data.anneeScolaireId },
  });

  if (!anneeScolaire) {
    throw new NotFoundError('Année scolaire introuvable');
  }

  // Verify salle if provided
  if (data.salleId) {
    const salle = await prisma.salles.findUnique({
      where: { id: data.salleId },
      select: { id: true, collegeId: true, departementId: true },
    });

    if (!salle) {
      throw new NotFoundError('Salle introuvable');
    }

    if (salle.collegeId !== data.collegeId) {
      throw new BadRequestError('La salle ne fait pas partie de ce collège');
    }
  }

  // ADMIN_COLLEGE: can only enroll in their college
  if (userRole === 'ADMIN_COLLEGE') {
    const adminCollege = await prisma.admin_colleges.findUnique({
      where: { userId },
      select: { collegeId: true },
    });

    if (!adminCollege) {
      throw new ForbiddenError('Admin college record not found');
    }

    if (data.collegeId !== adminCollege.collegeId) {
      throw new ForbiddenError(
        'Vous ne pouvez inscrire des étudiants que dans votre collège'
      );
    }
  }

  // Check if student is already enrolled for this academic year
  const existingInscription = await prisma.inscriptions.findUnique({
    where: {
      etudiantId_anneeScolaireId: {
        etudiantId: data.etudiantId,
        anneeScolaireId: data.anneeScolaireId,
      },
    },
  });

  if (existingInscription) {
    throw new ConflictError(
      `L'étudiant est déjà inscrit pour l'année scolaire ${anneeScolaire.libelle}`
    );
  }

  // Create inscription
  const inscription = await prisma.inscriptions.create({
    data: {
      etudiantId: data.etudiantId,
      collegeId: data.collegeId,
      anneeScolaireId: data.anneeScolaireId,
      salleId: data.salleId || null,
      dateInscription: data.dateInscription ? new Date(data.dateInscription) : new Date(),
    },
    include: {
      etudiant: {
        select: {
          id: true,
          nom: true,
          prenom: true,
        },
      },
      college: {
        select: {
          id: true,
          nom: true,
        },
      },
      anneeScolaire: {
        select: {
          id: true,
          libelle: true,
        },
      },
      salle: {
        select: {
          id: true,
          numero: true,
          departement: {
            select: {
              id: true,
              nom: true,
            },
          },
        },
      },
    },
  });

  return inscription;
};

/**
 * Update an inscription
 * ADMIN_GLOBAL can update any inscription
 * ADMIN_COLLEGE can only update inscriptions in their college
 * Note: Cannot change etudiantId or anneeScolaireId (unique constraint)
 */
export const updateInscription = async (
  inscriptionId: string,
  data: UpdateInscriptionInput,
  userRole: string,
  userId: string
) => {
  // Get inscription to verify existence and check access
  const existingInscription = await getInscriptionById(inscriptionId, userRole, userId);

  // If changing college, verify new college exists and user has access
  if (data.collegeId && data.collegeId !== existingInscription.collegeId) {
    const newCollege = await prisma.colleges.findUnique({
      where: { id: data.collegeId },
    });

    if (!newCollege) {
      throw new NotFoundError('Nouveau collège introuvable');
    }

    // ADMIN_COLLEGE: can only change to their own college
    if (userRole === 'ADMIN_COLLEGE') {
      const adminCollege = await prisma.admin_colleges.findUnique({
        where: { userId },
        select: { collegeId: true },
      });

      if (!adminCollege) {
        throw new ForbiddenError('Admin college record not found');
      }

      if (data.collegeId !== adminCollege.collegeId) {
        throw new ForbiddenError(
          'Vous ne pouvez transférer que vers votre collège'
        );
      }
    }
  }

  // Verify salle if provided
  if (data.salleId !== undefined && data.salleId !== null) {
    const salle = await prisma.salles.findUnique({
      where: { id: data.salleId },
      select: { id: true, collegeId: true, departementId: true },
    });

    if (!salle) {
      throw new NotFoundError('Salle introuvable');
    }

    // Verify salle belongs to the inscription's college (or new college if changing)
    const targetCollegeId = data.collegeId || existingInscription.collegeId;
    if (salle.collegeId !== targetCollegeId) {
      throw new BadRequestError('La salle ne fait pas partie de ce collège');
    }
  }

  // Prepare update data
  const updateData: any = {};
  if (data.collegeId) updateData.collegeId = data.collegeId;
  if (data.salleId !== undefined) updateData.salleId = data.salleId;
  if (data.dateInscription) updateData.dateInscription = new Date(data.dateInscription);

  // Update inscription
  const updatedInscription = await prisma.inscriptions.update({
    where: { id: inscriptionId },
    data: updateData,
    include: {
      etudiant: {
        select: {
          id: true,
          nom: true,
          prenom: true,
        },
      },
      college: {
        select: {
          id: true,
          nom: true,
        },
      },
      anneeScolaire: {
        select: {
          id: true,
          libelle: true,
        },
      },
      salle: {
        select: {
          id: true,
          numero: true,
          departement: {
            select: {
              id: true,
              nom: true,
            },
          },
        },
      },
    },
  });

  return updatedInscription;
};

/**
 * Delete an inscription
 * Warning: This will also delete related notes (cascade)
 */
export const deleteInscription = async (
  inscriptionId: string,
  userRole: string,
  userId: string
) => {
  // Get inscription to verify existence and check access
  const inscription = await getInscriptionById(inscriptionId, userRole, userId);

  // Check if inscription has notes
  const notesCount = await prisma.notes.count({
    where: {
      etudiantId: inscription.etudiantId,
      anneeScolaireId: inscription.anneeScolaireId,
    },
  });

  if (notesCount > 0) {
    throw new ConflictError(
      `Impossible de supprimer cette inscription : l'étudiant a ${notesCount} note(s) pour cette année. Supprimez d'abord les notes.`
    );
  }

  // Delete inscription
  await prisma.inscriptions.delete({
    where: { id: inscriptionId },
  });

  return { message: 'Inscription supprimée avec succès' };
};

/**
 * Get inscriptions for a specific student
 */
export const getInscriptionsByStudent = async (
  etudiantId: string,
  userRole: string,
  userId: string
) => {
  // Verify student exists
  const etudiant = await prisma.etudiants.findUnique({
    where: { id: etudiantId },
  });

  if (!etudiant) {
    throw new NotFoundError('Étudiant introuvable');
  }

  // Build where clause
  let whereClause: any = { etudiantId };

  // ADMIN_COLLEGE: only inscriptions in their college
  if (userRole === 'ADMIN_COLLEGE') {
    const adminCollege = await prisma.admin_colleges.findUnique({
      where: { userId },
      select: { collegeId: true },
    });

    if (!adminCollege) {
      throw new ForbiddenError('Admin college record not found');
    }

    whereClause.collegeId = adminCollege.collegeId;
  }

  const inscriptions = await prisma.inscriptions.findMany({
    where: whereClause,
    include: {
      college: {
        select: {
          id: true,
          nom: true,
        },
      },
      anneeScolaire: {
        select: {
          id: true,
          libelle: true,
          dateDebut: true,
          dateFin: true,
          estActive: true,
        },
      },
      salle: {
        select: {
          id: true,
          numero: true,
          nbPlaces: true,
          departement: {
            select: {
              id: true,
              nom: true,
            },
          },
        },
      },
    },
    orderBy: { anneeScolaire: { dateDebut: 'desc' } },
  });

  return inscriptions;
};

/**
 * Create enrollment request (student submits request)
 * Verifies enrollment period is open before creating request
 */
export const createDemandeInscription = async (
  data: CreateDemandeInscriptionInput,
  userId: string
) => {
  logger.debug('Creating enrollment request', { userId, ...data });

  // 1. Get student profile
  const etudiant = await prisma.etudiants.findUnique({
    where: { userId },
    select: { id: true, nom: true, prenom: true, collegeId: true },
  });

  if (!etudiant) {
    throw new NotFoundError('Profil étudiant introuvable');
  }

  // 2. Verify academic year exists and enrollment is open
  const anneeScolaire = await prisma.annees_scolaires.findUnique({
    where: { id: data.anneeScolaireId },
    select: {
      id: true,
      libelle: true,
      dateOuvertureInscriptions: true,
      dateFermetureInscriptions: true,
      estInscriptionOuverte: true,
    },
  });

  if (!anneeScolaire) {
    throw new NotFoundError('Année scolaire introuvable');
  }

  // 3. Check enrollment period
  const now = new Date();
  const isOpen =
    anneeScolaire.estInscriptionOuverte &&
    now >= new Date(anneeScolaire.dateOuvertureInscriptions) &&
    now <= new Date(anneeScolaire.dateFermetureInscriptions);

  if (!isOpen) {
    throw new ConflictError(
      `Les inscriptions pour l'année ${anneeScolaire.libelle} sont fermées.`
    );
  }

  // 4. Verify college exists
  const college = await prisma.colleges.findUnique({
    where: { id: data.collegeId },
    select: { id: true, nom: true },
  });

  if (!college) {
    throw new NotFoundError('Collège introuvable');
  }

  // 5. Check for existing request
  const existingDemande = await prisma.inscriptions.findUnique({
    where: {
      etudiantId_anneeScolaireId: {
        etudiantId: etudiant.id,
        anneeScolaireId: data.anneeScolaireId,
      },
    },
  });

  if (existingDemande) {
    throw new ConflictError(
      `Vous avez déjà une demande d'inscription pour l'année ${anneeScolaire.libelle} (Statut: ${existingDemande.statut})`
    );
  }

  // 6. Create enrollment request
  const demande = await prisma.inscriptions.create({
    data: {
      etudiantId: etudiant.id,
      collegeId: data.collegeId,
      anneeScolaireId: data.anneeScolaireId,
      statut: 'EN_ATTENTE',
      dateInscription: new Date(),
    },
    include: {
      college: { select: { id: true, nom: true } },
      anneeScolaire: { select: { id: true, libelle: true } },
    },
  });

  logger.info(`Enrollment request created: ${etudiant.prenom} ${etudiant.nom} → ${college.nom}`, {
    demandeId: demande.id,
    etudiantId: etudiant.id,
    collegeId: college.id,
  });

  return demande;
};

/**
 * Respond to enrollment request (admin accepts/rejects)
 * If ACCEPTED: fills collegeId in etudiants + statut = ACTIF
 */
export const repondreDemandeInscription = async (
  inscriptionId: string,
  data: RepondreDemandeInput,
  userId: string,
  userRole: string
) => {
  logger.debug('Responding to enrollment request', { inscriptionId, ...data, userId });

  // 1. Get request
  const demande = await prisma.inscriptions.findUnique({
    where: { id: inscriptionId },
    include: {
      etudiant: {
        select: { id: true, nom: true, prenom: true, collegeId: true, statut: true },
      },
      college: { select: { id: true, nom: true } },
      anneeScolaire: { select: { id: true, libelle: true } },
    },
  });

  if (!demande) {
    throw new NotFoundError('Demande d\'inscription introuvable');
  }

  // 2. Verify status is EN_ATTENTE
  if (demande.statut !== 'EN_ATTENTE') {
    throw new ConflictError(
      `Cette demande a déjà été traitée (Statut: ${demande.statut})`
    );
  }

  // 3. Verify admin has access
  if (userRole === 'ADMIN_COLLEGE') {
    const adminCollege = await prisma.admin_colleges.findUnique({
      where: { userId },
      select: { collegeId: true },
    });

    if (!adminCollege || adminCollege.collegeId !== demande.collegeId) {
      throw new ForbiddenError('Vous ne pouvez gérer que les demandes de votre collège');
    }
  }

  // 4. Update in transaction
  const result = await prisma.$transaction(async (tx) => {
    const updatedDemande = await tx.inscriptions.update({
      where: { id: inscriptionId },
      data: {
        statut: data.statut,
        dateReponse: new Date(),
        salleId: data.salleId || null,
      },
      include: {
        etudiant: true,
        college: true,
        anneeScolaire: true,
        salle: {
          select: {
            id: true,
            numero: true,
            departement: { select: { id: true, nom: true } },
          },
        },
      },
    });

    // If ACCEPTED: update student
    if (data.statut === 'ACCEPTE') {
      await tx.etudiants.update({
        where: { id: demande.etudiant.id },
        data: {
          collegeId: demande.collegeId,
          statut: 'ACTIF',
        },
      });

      logger.info(`Enrollment accepted: ${demande.etudiant.prenom} ${demande.etudiant.nom} → ${demande.college.nom}`, {
        etudiantId: demande.etudiant.id,
        collegeId: demande.collegeId,
        inscriptionId,
      });
    } else {
      logger.info(`Enrollment rejected: ${demande.etudiant.prenom} ${demande.etudiant.nom} → ${demande.college.nom}`, {
        etudiantId: demande.etudiant.id,
        inscriptionId,
      });
    }

    return updatedDemande;
  }, {
    timeout: 30000,
  });

  return result;
};

/**
 * Get student's own enrollment requests
 */
export const getMesDemandesInscription = async (userId: string) => {
  const etudiant = await prisma.etudiants.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!etudiant) {
    throw new NotFoundError('Profil étudiant introuvable');
  }

  const demandes = await prisma.inscriptions.findMany({
    where: { etudiantId: etudiant.id },
    include: {
      college: { select: { id: true, nom: true, adresse: true } },
      anneeScolaire: { select: { id: true, libelle: true } },
      salle: {
        select: {
          id: true,
          numero: true,
          departement: { select: { id: true, nom: true } },
        },
      },
    },
    orderBy: { dateInscription: 'desc' },
  });

  return demandes;
};

/**
 * Get pending enrollment requests for admin
 */
export const getDemandesEnAttente = async (userId: string, userRole: string) => {
  let whereClause: any = {
    statut: 'EN_ATTENTE',
  };

  if (userRole === 'ADMIN_COLLEGE') {
    const adminCollege = await prisma.admin_colleges.findUnique({
      where: { userId },
      select: { collegeId: true },
    });

    if (!adminCollege) {
      throw new ForbiddenError('Admin college record not found');
    }

    whereClause.collegeId = adminCollege.collegeId;
  }

  const demandes = await prisma.inscriptions.findMany({
    where: whereClause,
    include: {
      etudiant: {
        select: {
          id: true,
          nom: true,
          prenom: true,
          telephone: true,
          anneeEntree: true,
          user: {
            select: {
              email: true,
            },
          },
        },
      },
      college: { select: { id: true, nom: true } },
      anneeScolaire: { select: { id: true, libelle: true } },
    },
    orderBy: { dateInscription: 'asc' },
  });

  return demandes;
};
