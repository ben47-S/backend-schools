/**
 * Etudiant Service
 * Business logic for student management
 */

import { prisma } from '../lib/prisma';
import {
  NotFoundError,
  ConflictError,
  ForbiddenError,
} from '../utils/errors';
import type {
  CreateEtudiantInput,
  UpdateEtudiantInput,
} from '../schemas/etudiant.schemas';

/**
 * Get all students
 * ADMIN_GLOBAL: sees all students
 * ADMIN_COLLEGE: sees only students enrolled in their college
 * Others: see all students (read-only)
 */
export const getAllEtudiants = async (
  userRole: string,
  userId: string
) => {
  // Build where clause based on role
  let whereClause = {};

  if (userRole === 'ADMIN_COLLEGE') {
    // Get admin's college
    const adminCollege = await prisma.adminCollege.findUnique({
      where: { userId },
      select: { collegeId: true },
    });

    if (!adminCollege) {
      throw new ForbiddenError('Admin college record not found');
    }

    // Filter students enrolled in this college
    whereClause = {
      inscriptions: {
        some: {
          collegeId: adminCollege.collegeId,
        },
      },
    };
  }

  const etudiants = await prisma.etudiant.findMany({
    where: whereClause,
    include: {
      user: {
        select: {
          id: true,
          email: true,
          isActive: true,
        },
      },
      inscriptions: {
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
            },
          },
        },
      },
    },
    orderBy: [{ nom: 'asc' }, { prenom: 'asc' }],
  });

  return etudiants;
};

/**
 * Get student by ID
 */
export const getEtudiantById = async (
  etudiantId: string,
  userRole: string,
  userId: string
) => {
  const etudiant = await prisma.etudiant.findUnique({
    where: { id: etudiantId },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          isActive: true,
        },
      },
      inscriptions: {
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
            },
          },
        },
      },
      parents: {
        include: {
          parent: {
            select: {
              id: true,
              nom: true,
              prenom: true,
              telephone: true,
              user: {
                select: {
                  id: true,
                  email: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!etudiant) {
    throw new NotFoundError('Étudiant introuvable');
  }

  // ADMIN_COLLEGE: check if student is enrolled in their college
  if (userRole === 'ADMIN_COLLEGE') {
    const adminCollege = await prisma.adminCollege.findUnique({
      where: { userId },
      select: { collegeId: true },
    });

    if (!adminCollege) {
      throw new ForbiddenError('Admin college record not found');
    }

    const hasAccess = etudiant.inscriptions.some(
      (inscription) => inscription.collegeId === adminCollege.collegeId
    );

    if (!hasAccess) {
      throw new ForbiddenError(
        "Vous n'avez pas accès à cet étudiant (pas dans votre collège)"
      );
    }
  }

  return etudiant;
};

/**
 * Create a new student
 * Requires ADMIN_GLOBAL or ADMIN_COLLEGE
 */
export const createEtudiant = async (
  data: CreateEtudiantInput,
  userRole: string,
  userId: string
) => {
  // Verify user exists and has ETUDIANT role
  const user = await prisma.user.findUnique({
    where: { id: data.userId },
  });

  if (!user) {
    throw new NotFoundError('User introuvable');
  }

  if (user.role !== 'ETUDIANT') {
    throw new ConflictError(
      'Le user doit avoir le rôle ETUDIANT pour créer un profil étudiant'
    );
  }

  // Check if student profile already exists for this user
  const existingEtudiant = await prisma.etudiant.findUnique({
    where: { userId: data.userId },
  });

  if (existingEtudiant) {
    throw new ConflictError('Un profil étudiant existe déjà pour cet utilisateur');
  }

  // Create student
  const etudiant = await prisma.etudiant.create({
    data: {
      userId: data.userId,
      nom: data.nom,
      prenom: data.prenom,
      telephone: data.telephone,
      anneeEntree: data.anneeEntree,
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          isActive: true,
        },
      },
    },
  });

  return etudiant;
};

/**
 * Update a student
 * ADMIN_GLOBAL can update any student
 * ADMIN_COLLEGE can only update students in their college
 */
export const updateEtudiant = async (
  etudiantId: string,
  data: UpdateEtudiantInput,
  userRole: string,
  userId: string
) => {
  // Get student to verify existence and check access
  const existingEtudiant = await getEtudiantById(etudiantId, userRole, userId);

  // Update student
  const updatedEtudiant = await prisma.etudiant.update({
    where: { id: etudiantId },
    data,
    include: {
      user: {
        select: {
          id: true,
          email: true,
          isActive: true,
        },
      },
    },
  });

  return updatedEtudiant;
};

/**
 * Delete a student
 * Cannot delete if student has enrollments or parents linked
 */
export const deleteEtudiant = async (
  etudiantId: string,
  userRole: string,
  userId: string
) => {
  // Get student to verify existence and check access
  const etudiant = await getEtudiantById(etudiantId, userRole, userId);

  // Check if student has enrollments
  if (etudiant.inscriptions.length > 0) {
    throw new ConflictError(
      'Impossible de supprimer un étudiant ayant des inscriptions. Supprimez d\'abord les inscriptions.'
    );
  }

  // Check if student has parents
  if (etudiant.parents.length > 0) {
    throw new ConflictError(
      'Impossible de supprimer un étudiant ayant des parents liés. Supprimez d\'abord les liens parents.'
    );
  }

  // Delete student
  await prisma.etudiant.delete({
    where: { id: etudiantId },
  });

  return { message: 'Étudiant supprimé avec succès' };
};
