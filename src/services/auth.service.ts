/**
 * Authentication Service
 * Business logic for authentication operations
 */

import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';
import { Role } from '../../generated/prisma/client';
import {
  ConflictError,
  NotFoundError,
  UnauthorizedError,
} from '../utils/errors';
import { generateTokens, verifyRefreshToken } from '../utils/jwt';
import type { RegisterInput, LoginInput, ChangePasswordInput, RegisterEtudiantInput, RegisterEnseignantInput } from '../schemas/auth.schemas';

/**
 * Register a new user
 */
export async function register(data: RegisterInput) {
  // Check if email already exists
  const existingUser = await prisma.users.findUnique({
    where: { email: data.email },
  });

  if (existingUser) {
    throw new ConflictError('Email already registered');
  }

  // Hash password
  const passwordHash = await bcrypt.hash(data.password, 10);

  // Create user with role-specific data using transaction
  const result = await prisma.$transaction(async (tx) => {
    // Create base user
    const user = await tx.users.create({
      data: {
        email: data.email,
        passwordHash,
        role: data.role,
        photoUrl: data.photoUrl,
        isActive: true,
      },
    });

    // Create role-specific record
    switch (data.role) {
      case Role.ENSEIGNANT:
        await tx.enseignants.create({
          data: {
            userId: user.id,
            nom: data.nom,
            prenom: data.prenom,
            telephone: data.telephone,
            datePriseFonction: data.datePriseFonction ? new Date(data.datePriseFonction) : new Date(),
            indice: data.indice || 1000,
            matiereId: data.matiereId,
          },
        });
        break;

      case Role.ETUDIANT:
        // ETUDIANT can self-register
        // They start with collegeId=null and statut=INACTIF
        // After submitting enrollment request and admin acceptance:
        // - collegeId is filled
        // - statut becomes ACTIF
        await tx.etudiants.create({
          data: {
            userId: user.id,
            nom: data.nom,
            prenom: data.prenom,
            telephone: data.telephone,
            anneeEntree: (data as any).anneeEntree,
            // collegeId: null by default
            // statut: INACTIF by default
          },
        });
        break;

      case Role.PARENT:
        await tx.parents.create({
          data: {
            userId: user.id,
            nom: data.nom,
            prenom: data.prenom,
            telephone: data.telephone,
          },
        });
        break;

      case Role.ADMIN_COLLEGE:
        // SECURITY: ADMIN_COLLEGE cannot self-register
        // They are created by ADMIN_GLOBAL when creating a college
        throw new ConflictError('Cannot register as ADMIN_COLLEGE. Contact ADMIN_GLOBAL.');

      case Role.ADMIN_GLOBAL:
        // No additional record needed
        break;
    }

    return user;
  });

  // Return user without password
  const { passwordHash: _, ...userWithoutPassword } = result;
  return userWithoutPassword;
}

/**
 * Login user
 */
export async function login(data: LoginInput) {
  // Find user by email with role-specific data
  const user = await prisma.users.findUnique({
    where: { email: data.email },
    include: {
      admin_colleges: {
        select: {
          collegeId: true,
        },
      },
    },
  });

  if (!user) {
    throw new UnauthorizedError('Invalid credentials');
  }

  // Check if user is active
  if (!user.isActive) {
    throw new UnauthorizedError('Account is disabled');
  }

  // Verify password
  const isPasswordValid = await bcrypt.compare(data.password, user.passwordHash);

  if (!isPasswordValid) {
    throw new UnauthorizedError('Invalid credentials');
  }

  // Generate tokens
  const tokens = generateTokens(user.id, user.email, user.role);

  // Return user without password and tokens
  const { passwordHash: _, admin_colleges, ...userWithoutPassword } = user;

  // Add collegeId for ADMIN_COLLEGE users
  const userWithCollegeId = {
    ...userWithoutPassword,
    collegeId: admin_colleges?.collegeId || null,
  };

  return {
    user: userWithCollegeId,
    tokens,
  };
}

/**
 * Refresh access token
 */
export async function refreshAccessToken(refreshToken: string) {
  // Verify refresh token
  const payload = verifyRefreshToken(refreshToken);

  // Get user from database
  const user = await prisma.users.findUnique({
    where: { id: payload.userId },
  });

  if (!user) {
    throw new UnauthorizedError('User not found');
  }

  if (!user.isActive) {
    throw new UnauthorizedError('Account is disabled');
  }

  // Generate new tokens
  const tokens = generateTokens(user.id, user.email, user.role);

  return tokens;
}

/**
 * Change user password
 */
export async function changePassword(
  userId: string,
  data: ChangePasswordInput
) {
  // Get user
  const user = await prisma.users.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new NotFoundError('User not found');
  }

  // Verify old password
  const isOldPasswordValid = await bcrypt.compare(
    data.oldPassword,
    user.passwordHash
  );

  if (!isOldPasswordValid) {
    throw new UnauthorizedError('Invalid old password');
  }

  // Hash new password
  const newPasswordHash = await bcrypt.hash(data.newPassword, 10);

  // Update password
  await prisma.users.update({
    where: { id: userId },
    data: { passwordHash: newPasswordHash },
  });

  return { message: 'Password changed successfully' };
}

/**
 * Register a new student (dedicated endpoint for self-registration)
 * Creates user with ETUDIANT role and associated etudiant profile
 * No college assignment yet (starts with collegeId=null, statut=INACTIF)
 */
export async function registerEtudiant(data: RegisterEtudiantInput) {
  // Check if email already exists
  const existingUser = await prisma.users.findUnique({
    where: { email: data.email },
  });

  if (existingUser) {
    throw new ConflictError('Email déjà enregistré');
  }

  // Hash password
  const passwordHash = await bcrypt.hash(data.password, 10);

  // Create user and etudiant profile in transaction
  const result = await prisma.$transaction(async (tx) => {
    // Create user
    const user = await tx.users.create({
      data: {
        email: data.email,
        passwordHash,
        role: Role.ETUDIANT,
        isActive: true,
      },
    });

    // Create etudiant profile (current year as anneeEntree)
    const etudiant = await tx.etudiants.create({
      data: {
        userId: user.id,
        nom: data.nom,
        prenom: data.prenom,
        telephone: data.telephone,
        anneeEntree: new Date().getFullYear(),
        // collegeId: null (will be filled after enrollment acceptance)
        // statut: INACTIF (will become ACTIF after enrollment acceptance)
      },
    });

    return { user, etudiant };
  });

  // Generate tokens
  const tokens = generateTokens(result.user.id, result.user.email, result.user.role);

  // Return response
  return {
    user: {
      id: result.user.id,
      email: result.user.email,
      role: result.user.role,
      isActive: result.user.isActive,
      createdAt: result.user.createdAt,
    },
    etudiant: {
      id: result.etudiant.id,
      userId: result.etudiant.userId,
      nom: result.etudiant.nom,
      prenom: result.etudiant.prenom,
      telephone: result.etudiant.telephone,
      anneeEntree: result.etudiant.anneeEntree,
      statut: result.etudiant.statut,
    },
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
  };
}

/**
 * Register a new teacher (dedicated endpoint for self-registration)
 * Creates user with ENSEIGNANT role and associated enseignant profile
 * No department assignment yet (starts without departements)
 */
export async function registerEnseignant(data: RegisterEnseignantInput) {
  // Check if email already exists
  const existingUser = await prisma.users.findUnique({
    where: { email: data.email },
  });

  if (existingUser) {
    throw new ConflictError('Email déjà enregistré');
  }

  // Hash password
  const passwordHash = await bcrypt.hash(data.password, 10);

  // Create user and enseignant profile in transaction
  const result = await prisma.$transaction(async (tx) => {
    // Create user
    const user = await tx.users.create({
      data: {
        email: data.email,
        passwordHash,
        role: Role.ENSEIGNANT,
        isActive: true,
      },
    });

    // Create enseignant profile
    const enseignant = await tx.enseignants.create({
      data: {
        userId: user.id,
        nom: data.nom,
        prenom: data.prenom,
        telephone: data.telephone,
        datePriseFonction: new Date(),
        indice: 1000, // Default indice
        // departements will be assigned via enseignant_demandes workflow
      },
    });

    return { user, enseignant };
  });

  // Generate tokens
  const tokens = generateTokens(result.user.id, result.user.email, result.user.role);

  // Return response
  return {
    user: {
      id: result.user.id,
      email: result.user.email,
      role: result.user.role,
      isActive: result.user.isActive,
      createdAt: result.user.createdAt,
    },
    enseignant: {
      id: result.enseignant.id,
      userId: result.enseignant.userId,
      nom: result.enseignant.nom,
      prenom: result.enseignant.prenom,
      telephone: result.enseignant.telephone,
      datePriseFonction: result.enseignant.datePriseFonction,
      indice: result.enseignant.indice,
    },
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
  };
}

/**
 * Get user profile with role-specific data
 */
export async function getUserProfile(userId: string) {
  const user = await prisma.users.findUnique({
    where: { id: userId },
    include: {
      enseignants: true,
      etudiants: true,
      parents: true,
      admin_colleges: {
        select: {
          collegeId: true,
        },
      },
    },
  });

  if (!user) {
    throw new NotFoundError('User not found');
  }

  // Return user without password and add collegeId at root level
  const { passwordHash: _, admin_colleges, ...userWithoutPassword } = user;

  return {
    ...userWithoutPassword,
    collegeId: admin_colleges?.collegeId || null,
  };
}
