/**
 * Parent Service
 * Business logic for parent management
 */

import { prisma } from '../lib/prisma';
import {
  NotFoundError,
  ConflictError,
  ForbiddenError,
} from '../utils/errors';
import type {
  CreateParentInput,
  UpdateParentInput,
  LinkChildInput,
  UnlinkChildInput,
} from '../schemas/parent.schemas';

/**
 * Get all parents
 * ADMIN_GLOBAL: sees all parents
 * ADMIN_COLLEGE: sees only parents with children enrolled in their college
 * Others: see all parents (read-only)
 */
export const getAllParents = async (userRole: string, userId: string) => {
  // Build where clause based on role
  let whereClause = {};

  if (userRole === 'ADMIN_COLLEGE') {
    // Get admin's college
    const adminCollege = await prisma.admin_colleges.findUnique({
      where: { userId },
      select: { collegeId: true },
    });

    if (!adminCollege) {
      throw new ForbiddenError('Admin college record not found');
    }

    // Filter parents with at least one child enrolled in this college
    whereClause = {
      parent_etudiants: {
        some: {
          etudiant: {
            inscriptions: {
              some: {
                collegeId: adminCollege.collegeId,
              },
            },
          },
        },
      },
    };
  }

  const parents = await prisma.parents.findMany({
    where: whereClause,
    include: {
      user: {
        select: {
          id: true,
          email: true,
          isActive: true,
        },
      },
      parent_etudiants: {
        include: {
          etudiant: {
            select: {
              id: true,
              nom: true,
              prenom: true,
              telephone: true,
            },
          },
        },
      },
    },
    orderBy: [{ nom: 'asc' }, { prenom: 'asc' }],
  });

  return parents;
};

/**
 * Get parent by ID
 */
export const getParentById = async (
  parentId: string,
  userRole: string,
  userId: string
) => {
  const parent = await prisma.parents.findUnique({
    where: { id: parentId },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          isActive: true,
        },
      },
      parent_etudiants: {
        include: {
          etudiant: {
            select: {
              id: true,
              nom: true,
              prenom: true,
              telephone: true,
              anneeEntree: true,
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
          },
        },
      },
    },
  });

  if (!parent) {
    throw new NotFoundError('Parent introuvable');
  }

  // ADMIN_COLLEGE: check if parent has at least one child in their college
  if (userRole === 'ADMIN_COLLEGE') {
    const adminCollege = await prisma.admin_colleges.findUnique({
      where: { userId },
      select: { collegeId: true },
    });

    if (!adminCollege) {
      throw new ForbiddenError('Admin college record not found');
    }

    const hasAccess = parent.enfants.some((pe) =>
      pe.etudiant.inscriptions.some(
        (inscription) => inscription.collegeId === adminCollege.collegeId
      )
    );

    if (!hasAccess) {
      throw new ForbiddenError(
        "Vous n'avez pas accès à ce parent (aucun enfant dans votre collège)"
      );
    }
  }

  return parent;
};

/**
 * Create a new parent
 * Requires ADMIN_GLOBAL or ADMIN_COLLEGE
 */
export const createParent = async (
  data: CreateParentInput,
  userRole: string,
  userId: string
) => {
  // Verify user exists and has PARENT role
  const user = await prisma.users.findUnique({
    where: { id: data.userId },
  });

  if (!user) {
    throw new NotFoundError('User introuvable');
  }

  if (user.role !== 'PARENT') {
    throw new ConflictError(
      'Le user doit avoir le rôle PARENT pour créer un profil parent'
    );
  }

  // Check if parent profile already exists for this user
  const existingParent = await prisma.parents.findUnique({
    where: { userId: data.userId },
  });

  if (existingParent) {
    throw new ConflictError('Un profil parent existe déjà pour cet utilisateur');
  }

  // Create parent
  const parent = await prisma.parents.create({
    data: {
      userId: data.userId,
      nom: data.nom,
      prenom: data.prenom,
      telephone: data.telephone,
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

  return parent;
};

/**
 * Update a parent
 * ADMIN_GLOBAL can update any parent
 * ADMIN_COLLEGE can only update parents with children in their college
 */
export const updateParent = async (
  parentId: string,
  data: UpdateParentInput,
  userRole: string,
  userId: string
) => {
  // Get parent to verify existence and check access
  await getParentById(parentId, userRole, userId);

  // Update parent
  const updatedParent = await prisma.parents.update({
    where: { id: parentId },
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

  return updatedParent;
};

/**
 * Delete a parent
 * Cannot delete if parent has children linked
 */
export const deleteParent = async (
  parentId: string,
  userRole: string,
  userId: string
) => {
  // Get parent to verify existence and check access
  const parent = await getParentById(parentId, userRole, userId);

  // Check if parent has children
  if (parent.enfants.length > 0) {
    throw new ConflictError(
      'Impossible de supprimer un parent ayant des enfants liés. Supprimez d\'abord les liens enfants.'
    );
  }

  // Delete parent
  await prisma.parents.delete({
    where: { id: parentId },
  });

  return { message: 'Parent supprimé avec succès' };
};

/**
 * Link a child (student) to a parent
 */
export const linkChild = async (
  parentId: string,
  data: LinkChildInput,
  userRole: string,
  userId: string
) => {
  // Verify parent exists and check access
  await getParentById(parentId, userRole, userId);

  // Verify student exists
  const etudiant = await prisma.etudiants.findUnique({
    where: { id: data.etudiantId },
  });

  if (!etudiant) {
    throw new NotFoundError('Étudiant introuvable');
  }

  // Check if link already exists
  const existingLink = await prisma.parentsEtudiant.findUnique({
    where: {
      parentId_etudiantId: {
        parentId,
        etudiantId: data.etudiantId,
      },
    },
  });

  if (existingLink) {
    throw new ConflictError('Ce parent est déjà lié à cet étudiant');
  }

  // Create the link
  const link = await prisma.parentsEtudiant.create({
    data: {
      parentId,
      etudiantId: data.etudiantId,
    },
    include: {
      etudiant: {
        select: {
          id: true,
          nom: true,
          prenom: true,
        },
      },
    },
  });

  return link;
};

/**
 * Unlink a child (student) from a parent
 */
export const unlinkChild = async (
  parentId: string,
  data: UnlinkChildInput,
  userRole: string,
  userId: string
) => {
  // Verify parent exists and check access
  await getParentById(parentId, userRole, userId);

  // Check if link exists
  const existingLink = await prisma.parentsEtudiant.findUnique({
    where: {
      parentId_etudiantId: {
        parentId,
        etudiantId: data.etudiantId,
      },
    },
  });

  if (!existingLink) {
    throw new NotFoundError('Ce lien parent-enfant n\'existe pas');
  }

  // Delete the link
  await prisma.parentsEtudiant.delete({
    where: {
      parentId_etudiantId: {
        parentId,
        etudiantId: data.etudiantId,
      },
    },
  });

  return { message: 'Lien parent-enfant supprimé avec succès' };
};
