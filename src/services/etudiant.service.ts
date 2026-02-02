/**
 * Etudiant Service
 * Business logic for student management
 */

import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';
import { Role } from '../../generated/prisma/client';
import {
  NotFoundError,
  ConflictError,
  ForbiddenError,
} from '../utils/errors';
import { logger } from '../utils/logger';
import type {
  CreateUserWithProfileInput,
  CreateEtudiantWithUserInput,
  CreateEtudiantInput,
  UpdateEtudiantInput,
} from '../schemas/etudiant.schemas';

/**
 * Create student with user account
 * Creates both user account and student profile in one transaction
 * Only ADMIN_COLLEGE and ADMIN_GLOBAL can create
 */
export const createEtudiantWithUser = async (
  data: CreateEtudiantWithUserInput,
  requestUserId: string
) => {
  logger.debug('Creating student with user account', {
    requestUserId,
    email: data.email,
    nom: data.nom,
    prenom: data.prenom,
  });

  // Check if email already exists
  const existingUser = await prisma.users.findUnique({
    where: { email: data.email },
  });

  if (existingUser) {
    logger.warn('Email already registered', { email: data.email, requestUserId });
    throw new ConflictError('Cet email est déjà utilisé');
  }

  // Create user and student profile in a transaction
  const result = await prisma.$transaction(async (tx) => {
    // 1. Hash password
    const passwordHash = await bcrypt.hash(data.password, 10);

    // 2. Create user account
    const user = await tx.users.create({
      data: {
        email: data.email,
        passwordHash,
        role: Role.ETUDIANT,
        photoUrl: data.photoUrl,
        isActive: true,
      },
    });

    logger.debug('User account created in transaction', {
      userId: user.id,
      email: user.email,
    });

    // 3. Create student profile with default statut ACTIF
    const etudiant = await tx.etudiants.create({
      data: {
        userId: user.id,
        nom: data.nom,
        prenom: data.prenom,
        telephone: data.telephone,
        anneeEntree: data.anneeEntree,
        statut: 'ACTIF', // <-- par défaut ACTIF
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            photoUrl: true,
            isActive: true,
          },
        },
      },
    });

    logger.debug('Student profile created in transaction', {
      etudiantId: etudiant.id,
      userId: user.id,
    });

    return etudiant;
  }, {
    timeout: 30000,
  });

  logger.crud('CREATE', 'Etudiant', requestUserId, result.id, {
    nom: result.nom,
    prenom: result.prenom,
    email: data.email,
  });

  logger.info(`Student created: ${result.prenom} ${result.nom}`, {
    etudiantId: result.id,
    userId: requestUserId,
  });

  return result;
};

/**
 * Get all students
 * ADMIN_GLOBAL: sees all students
 * ADMIN_COLLEGE: sees only students enrolled in their college
 * ETUDIANT: sees only students from their college
 * Others: see all students (read-only)
 */
export const getAllEtudiants = async (
  userRole: string,
  userId: string
) => {
  let whereClause = {};

  if (userRole === 'ADMIN_COLLEGE') {
    const adminCollege = await prisma.admin_colleges.findUnique({
      where: { userId },
      select: { collegeId: true },
    });

    if (!adminCollege) throw new ForbiddenError('Admin college record not found');

    whereClause = { collegeId: adminCollege.collegeId };
  } else if (userRole === 'ETUDIANT') {
    const etudiant = await prisma.etudiants.findUnique({
      where: { userId },
      select: { collegeId: true },
    });

    if (!etudiant) throw new NotFoundError('Profil étudiant introuvable');

    whereClause = etudiant.collegeId
      ? { collegeId: etudiant.collegeId }
      : { id: 'no-match' };
  }

  const etudiants = await prisma.etudiants.findMany({
    where: whereClause,
    include: {
      user: { select: { id: true, email: true, isActive: true } },
      college: { select: { id: true, nom: true } },
      inscriptions: {
        include: {
          college: { select: { id: true, nom: true } },
          anneeScolaire: { select: { id: true, libelle: true } },
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
  const etudiant = await prisma.etudiants.findUnique({
    where: { id: etudiantId },
    include: {
      user: { select: { id: true, email: true, isActive: true } },
      inscriptions: {
        include: {
          college: { select: { id: true, nom: true } },
          anneeScolaire: { select: { id: true, libelle: true } },
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
              user: { select: { id: true, email: true } },
            },
          },
        },
      },
    },
  });

  if (!etudiant) throw new NotFoundError('Étudiant introuvable');

  if (userRole === 'ADMIN_COLLEGE') {
    const adminCollege = await prisma.admin_colleges.findUnique({
      where: { userId },
      select: { collegeId: true },
    });

    if (!adminCollege) throw new ForbiddenError('Admin college record not found');

    const hasAccess = etudiant.inscriptions.some(
      (inscription) => inscription.collegeId === adminCollege.collegeId
    );

    if (!hasAccess)
      throw new ForbiddenError(
        "Vous n'avez pas accès à cet étudiant (pas dans votre collège)"
      );
  }

  return etudiant;
};

/**
 * Create a new student
 */
export const createEtudiant = async (
  data: CreateEtudiantInput,
  userRole: string,
  userId: string
) => {
  const user = await prisma.users.findUnique({ where: { id: data.userId } });
  if (!user) throw new NotFoundError('User introuvable');
  if (user.role !== 'ETUDIANT') throw new ConflictError('Le user doit avoir le rôle ETUDIANT pour créer un profil étudiant');

  const existingEtudiant = await prisma.etudiants.findUnique({ where: { userId: data.userId } });
  if (existingEtudiant) throw new ConflictError('Un profil étudiant existe déjà pour cet utilisateur');

  const etudiant = await prisma.etudiants.create({
    data: {
      userId: data.userId,
      nom: data.nom,
      prenom: data.prenom,
      telephone: data.telephone,
      anneeEntree: data.anneeEntree,
      statut: 'ACTIF', // <-- par défaut ACTIF
    },
    include: {
      user: { select: { id: true, email: true, isActive: true } },
    },
  });

  return etudiant;
};

/**
 * Update a student
 */
export const updateEtudiant = async (
  etudiantId: string,
  data: UpdateEtudiantInput,
  userRole: string,
  userId: string
) => {
  const existingEtudiant = await getEtudiantById(etudiantId, userRole, userId);

  const updatedEtudiant = await prisma.etudiants.update({
    where: { id: etudiantId },
    data,
    include: { user: { select: { id: true, email: true, isActive: true } } },
  });

  return updatedEtudiant;
};

/**
 * Delete a student
 */
export const deleteEtudiant = async (
  etudiantId: string,
  userRole: string,
  userId: string
) => {
  const etudiant = await getEtudiantById(etudiantId, userRole, userId);

  if (etudiant.inscriptions.length > 0) {
    throw new ConflictError(
      'Impossible de supprimer un étudiant ayant des inscriptions. Supprimez d\'abord les inscriptions.'
    );
  }

  if (etudiant.parents.length > 0) {
    throw new ConflictError(
      'Impossible de supprimer un étudiant ayant des parents liés. Supprimez d\'abord les liens parents.'
    );
  }

  await prisma.etudiants.delete({ where: { id: etudiantId } });

  return { message: 'Étudiant supprimé avec succès' };
};

/**
 * Get current student's inscriptions
 * Returns all inscriptions for the authenticated student
 */
export const getMesInscriptions = async (userId: string) => {
  logger.debug('Getting student inscriptions', { userId });

  // Get the student profile
  const etudiant = await prisma.etudiants.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!etudiant) {
    throw new NotFoundError('Profil étudiant introuvable');
  }

  // Get inscriptions with all related data
  const inscriptions = await prisma.inscriptions.findMany({
    where: { etudiantId: etudiant.id },
    include: {
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
          estActive: true,
          dateDebut: true,
          dateFin: true,
        },
      },
      salle: {
        select: {
          id: true,
          numero: true,
          nbPlaces: true,
        },
      },
    },
    orderBy: [
      { anneeScolaire: { dateDebut: 'desc' } },
      { dateInscription: 'desc' },
    ],
  });

  return inscriptions;
};

/**
 * Get current student's notes
 * Returns notes with optional filtering by academic year
 */
export const getMesNotes = async (
  userId: string,
  anneeScolaireId?: string
) => {
  logger.debug('Getting student notes', { userId, anneeScolaireId });

  // Get the student profile
  const etudiant = await prisma.etudiants.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!etudiant) {
    throw new NotFoundError('Profil étudiant introuvable');
  }

  // Build where clause
  const whereClause: any = {
    etudiantId: etudiant.id,
  };

  if (anneeScolaireId) {
    whereClause.anneeScolaireId = anneeScolaireId;
  }

  // Get notes with all related data
  const notes = await prisma.notes.findMany({
    where: whereClause,
    include: {
      matiere: {
        select: {
          id: true,
          nom: true,
          departement: {
            select: {
              id: true,
              nom: true,
            },
          },
        },
      },
      anneeScolaire: {
        select: {
          id: true,
          libelle: true,
          estActive: true,
        },
      },
    },
    orderBy: [
      { anneeScolaire: { dateDebut: 'desc' } },
      { dateNote: 'desc' },
    ],
  });

  return notes;
};
