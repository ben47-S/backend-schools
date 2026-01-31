/**
 * Inscription Service
 * Business logic for student enrollment management
 */

import { prisma } from '../lib/prisma';
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
    const adminCollege = await prisma.adminCollege.findUnique({
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

  const inscriptions = await prisma.inscription.findMany({
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
  const inscription = await prisma.inscription.findUnique({
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
    },
  });

  if (!inscription) {
    throw new NotFoundError('Inscription introuvable');
  }

  // ADMIN_COLLEGE: check if inscription is in their college
  if (userRole === 'ADMIN_COLLEGE') {
    const adminCollege = await prisma.adminCollege.findUnique({
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
  const etudiant = await prisma.etudiant.findUnique({
    where: { id: data.etudiantId },
  });

  if (!etudiant) {
    throw new NotFoundError('Étudiant introuvable');
  }

  // Verify college exists
  const college = await prisma.college.findUnique({
    where: { id: data.collegeId },
  });

  if (!college) {
    throw new NotFoundError('Collège introuvable');
  }

  // Verify academic year exists
  const anneeScolaire = await prisma.anneeScolaire.findUnique({
    where: { id: data.anneeScolaireId },
  });

  if (!anneeScolaire) {
    throw new NotFoundError('Année scolaire introuvable');
  }

  // ADMIN_COLLEGE: can only enroll in their college
  if (userRole === 'ADMIN_COLLEGE') {
    const adminCollege = await prisma.adminCollege.findUnique({
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
  const existingInscription = await prisma.inscription.findUnique({
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
  const inscription = await prisma.inscription.create({
    data: {
      etudiantId: data.etudiantId,
      collegeId: data.collegeId,
      anneeScolaireId: data.anneeScolaireId,
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
    const newCollege = await prisma.college.findUnique({
      where: { id: data.collegeId },
    });

    if (!newCollege) {
      throw new NotFoundError('Nouveau collège introuvable');
    }

    // ADMIN_COLLEGE: can only change to their own college
    if (userRole === 'ADMIN_COLLEGE') {
      const adminCollege = await prisma.adminCollege.findUnique({
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

  // Prepare update data
  const updateData: any = {};
  if (data.collegeId) updateData.collegeId = data.collegeId;
  if (data.dateInscription) updateData.dateInscription = new Date(data.dateInscription);

  // Update inscription
  const updatedInscription = await prisma.inscription.update({
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
  const notesCount = await prisma.note.count({
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
  await prisma.inscription.delete({
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
  const etudiant = await prisma.etudiant.findUnique({
    where: { id: etudiantId },
  });

  if (!etudiant) {
    throw new NotFoundError('Étudiant introuvable');
  }

  // Build where clause
  let whereClause: any = { etudiantId };

  // ADMIN_COLLEGE: only inscriptions in their college
  if (userRole === 'ADMIN_COLLEGE') {
    const adminCollege = await prisma.adminCollege.findUnique({
      where: { userId },
      select: { collegeId: true },
    });

    if (!adminCollege) {
      throw new ForbiddenError('Admin college record not found');
    }

    whereClause.collegeId = adminCollege.collegeId;
  }

  const inscriptions = await prisma.inscription.findMany({
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
    },
    orderBy: { anneeScolaire: { dateDebut: 'desc' } },
  });

  return inscriptions;
};
