/**
 * College Service
 * Business logic for college management
 */

import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';
import { NotFoundError, ForbiddenError, ConflictError } from '../utils/errors';
import { logger } from '../utils/logger';
import { Role } from '../../generated/prisma/client';
import type {
  CreateCollegeInput,
  UpdateCollegeInput,
  CreateCollegeWithAdminInput
} from '../schemas/college.schemas';

/**
 * Get all colleges (public - for registration)
 * Returns all colleges without authentication
 */
export async function getAllCollegesPublic() {
  logger.debug('Fetching all colleges (public)');

  const colleges = await prisma.colleges.findMany({
    select: {
      id: true,
      nom: true,
      siteWeb: true,
      adresse: true,
      createdAt: true,
    },
    orderBy: { nom: 'asc' },
  });

  logger.info('Public college list retrieved', { count: colleges.length });

  return colleges;
}

/**
 * Get all colleges
 * ADMIN_GLOBAL: all colleges
 * ADMIN_COLLEGE: only their college
 */
export async function getAllColleges(userId: string, userRole: string) {
  logger.debug('Fetching colleges', { userId, userRole });

  // ADMIN_GLOBAL voit tous les collèges
  if (userRole === 'ADMIN_GLOBAL') {
    const colleges = await prisma.colleges.findMany({
      orderBy: { nom: 'asc' },
    });

    logger.crud('READ', 'College', userId, undefined, {
      count: colleges.length,
      filter: 'all',
    });

    return colleges;
  }

  // ADMIN_COLLEGE voit uniquement son collège
  if (userRole === 'ADMIN_COLLEGE') {
    const adminCollege = await prisma.admin_colleges.findUnique({
      where: { userId },
      include: { college: true },
    });

    if (!adminCollege) {
      logger.warn('Admin college not found', { userId });
      throw new NotFoundError('Admin college configuration not found');
    }

    logger.crud('READ', 'College', userId, adminCollege.collegeId, {
      filter: 'own',
    });

    return [adminCollege.college];
  }

  // Autres rôles n'ont pas accès
  logger.access(userId, 'College', 'READ_ALL', false, 'Insufficient permissions');
  throw new ForbiddenError('Insufficient permissions to view colleges');
}

/**
 * Get college by ID
 */
export async function getCollegeById(
  collegeId: string,
  userId: string,
  userRole: string
) {
  logger.debug('Fetching college by ID', { collegeId, userId, userRole });

  // Vérifier que le collège existe
  const college = await prisma.colleges.findUnique({
    where: { id: collegeId },
    include: {
      _count: {
        select: {
          departements: true,
          salles: true,
          inscriptions: true,
        },
      },
    },
  });

  if (!college) {
    logger.warn('College not found', { collegeId, userId });
    throw new NotFoundError('College not found');
  }

  // ADMIN_GLOBAL peut voir n'importe quel collège
  if (userRole === 'ADMIN_GLOBAL') {
    logger.crud('READ', 'College', userId, collegeId);
    return college;
  }

  // ADMIN_COLLEGE ne peut voir que son collège
  if (userRole === 'ADMIN_COLLEGE') {
    const adminCollege = await prisma.admin_colleges.findUnique({
      where: { userId },
    });

    if (!adminCollege || adminCollege.collegeId !== collegeId) {
      logger.access(userId, 'College', 'READ', false, 'Not their college');
      throw new ForbiddenError('You can only view your own college');
    }

    logger.crud('READ', 'College', userId, collegeId);
    return college;
  }

  logger.access(userId, 'College', 'READ', false, 'Insufficient permissions');
  throw new ForbiddenError('Insufficient permissions to view this college');
}

/**
 * Create a new college
 * Only ADMIN_GLOBAL can create
 */
export async function createCollege(data: CreateCollegeInput, userId: string) {
  logger.debug('Creating college', { userId, nom: data.nom });

  const college = await prisma.colleges.create({
    data: {
      nom: data.nom,
      adresse: data.adresse,
      siteWeb: data.siteWeb,
    },
  });

  logger.crud('CREATE', 'College', userId, college.id, {
    nom: college.nom,
  });

  logger.info(`College created: ${college.nom}`, {
    collegeId: college.id,
    userId,
  });

  return college;
}

/**
 * Create a new college with its administrator
 * Only ADMIN_GLOBAL can create
 * Creates college and admin user in a single transaction
 */
export async function createCollegeWithAdmin(
  data: CreateCollegeWithAdminInput,
  userId: string
) {
  logger.debug('Creating college with admin', {
    userId,
    nom: data.nom,
    adminEmail: data.adminEmail,
  });

  // Vérifier que l'email admin n'existe pas déjà
  const existingUser = await prisma.users.findUnique({
    where: { email: data.adminEmail },
  });

  if (existingUser) {
    logger.warn('Admin email already exists', {
      adminEmail: data.adminEmail,
      userId,
    });
    throw new ConflictError('Admin email already registered');
  }

  // Créer le collège et l'admin dans une transaction
  // Timeout augmenté pour Neon (30 secondes au lieu de 5 par défaut)
  const college = await prisma.$transaction(async (tx) => {
    // 1. Créer le collège
    const newCollege = await tx.colleges.create({
      data: {
        nom: data.nom,
        adresse: data.adresse,
        siteWeb: data.siteWeb,
      },
    });

    logger.debug('College created in transaction', {
      collegeId: newCollege.id,
      nom: newCollege.nom,
    });

    // 2. Hash du mot de passe admin
    const passwordHash = await bcrypt.hash(data.adminPassword, 10);

    // 3. Créer l'utilisateur admin
    const adminUser = await tx.users.create({
      data: {
        email: data.adminEmail,
        passwordHash,
        role: Role.ADMIN_COLLEGE,
        photoUrl: data.adminPhotoUrl,
        isActive: true,
      },
    });

    logger.debug('Admin user created in transaction', {
      adminUserId: adminUser.id,
      adminEmail: adminUser.email,
    });

    // 4. Créer le profil Enseignant avec nom et prénom
    await tx.enseignants.create({
      data: {
        userId: adminUser.id,
        nom: data.adminNom,
        prenom: data.adminPrenom,
        telephone: data.adminTelephone,
        datePriseFonction: new Date(), // Date de création du compte
        indice: 1000, // Indice par défaut pour admin de collège
      },
    });

    logger.debug('Admin enseignant profile created', {
      adminUserId: adminUser.id,
    });

    // 5. Créer le lien AdminCollege
    await tx.admin_colleges.create({
      data: {
        userId: adminUser.id,
        collegeId: newCollege.id,
      },
    });

    logger.debug('AdminCollege link created', {
      adminUserId: adminUser.id,
      collegeId: newCollege.id,
    });

    return newCollege;
  }, {
    timeout: 30000, // 30 secondes de timeout pour la transaction (au lieu de 5s par défaut)
  });

  logger.crud('CREATE', 'College', userId, college.id, {
    nom: college.nom,
    withAdmin: true,
    adminEmail: data.adminEmail,
  });

  logger.info(`College created with admin: ${college.nom}`, {
    collegeId: college.id,
    adminEmail: data.adminEmail,
    userId,
  });

  return college;
}

/**
 * Update a college
 * ADMIN_GLOBAL: can update any college
 * ADMIN_COLLEGE: can update only their college
 */
export async function updateCollege(
  collegeId: string,
  data: UpdateCollegeInput,
  userId: string,
  userRole: string
) {
  logger.debug('Updating college', { collegeId, userId, userRole });

  // Vérifier que le collège existe
  const existingCollege = await prisma.colleges.findUnique({
    where: { id: collegeId },
  });

  if (!existingCollege) {
    logger.warn('College not found for update', { collegeId, userId });
    throw new NotFoundError('College not found');
  }

  // ADMIN_COLLEGE ne peut modifier que son collège
  if (userRole === 'ADMIN_COLLEGE') {
    const adminCollege = await prisma.admin_colleges.findUnique({
      where: { userId },
    });

    if (!adminCollege || adminCollege.collegeId !== collegeId) {
      logger.access(userId, 'College', 'UPDATE', false, 'Not their college');
      throw new ForbiddenError('You can only update your own college');
    }
  }

  // Mettre à jour
  const college = await prisma.colleges.update({
    where: { id: collegeId },
    data: {
      ...(data.nom && { nom: data.nom }),
      ...(data.adresse && { adresse: data.adresse }),
      ...(data.siteWeb !== undefined && { siteWeb: data.siteWeb }),
    },
  });

  logger.crud('UPDATE', 'College', userId, collegeId, {
    changes: data,
  });

  logger.info(`College updated: ${college.nom}`, {
    collegeId: college.id,
    userId,
  });

  return college;
}

/**
 * Delete a college
 * Only ADMIN_GLOBAL can delete
 */
export async function deleteCollege(collegeId: string, userId: string) {
  logger.debug('Deleting college', { collegeId, userId });

  // Vérifier que le collège existe
  const existingCollege = await prisma.colleges.findUnique({
    where: { id: collegeId },
  });

  if (!existingCollege) {
    logger.warn('College not found for deletion', { collegeId, userId });
    throw new NotFoundError('College not found');
  }

  // Supprimer (cascade delete géré par Prisma)
  await prisma.colleges.delete({
    where: { id: collegeId },
  });

  logger.crud('DELETE', 'College', userId, collegeId, {
    nom: existingCollege.nom,
  });

  logger.info(`College deleted: ${existingCollege.nom}`, {
    collegeId,
    userId,
  });

  return { message: 'College deleted successfully' };
}

/**
 * Get college for current admin
 * Returns the college associated with the current admin user
 */
export async function getMyCollege(userId: string) {
  logger.debug('Fetching college for current admin', { userId });

  // Find the admin_colleges record for this user
  const adminCollege = await prisma.admin_colleges.findUnique({
    where: { userId },
    include: {
      college: {
        include: {
          _count: {
            select: {
              departements: true,
              salles: true,
              etudiants: true,
            },
          },
        },
      },
    },
  });

  if (!adminCollege) {
    logger.warn('Admin college not found for user', { userId });
    throw new NotFoundError('You are not assigned as an admin to any college');
  }

  logger.crud('READ', 'AdminCollege', userId, adminCollege.collegeId, {
    action: 'getMyCollege',
  });

  return adminCollege.college;
}
