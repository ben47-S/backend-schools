/**
 * Authentication Controller
 * HTTP request handlers for auth routes
 */

import { Request, Response, NextFunction } from 'express';
import * as authService from '../services/auth.service';
import { successResponse } from '../utils/response';
import type {
  RegisterInput,
  LoginInput,
  RefreshTokenInput,
  ChangePasswordInput,
  RegisterEtudiantInput,
  RegisterEnseignantInput,
} from '../schemas/auth.schemas';

/**
 * Register a new user
 * POST /api/auth/register
 */
export async function register(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const data: RegisterInput = req.body;
    console.log(`📝 Tentative d'inscription - Email: ${data.email}, Rôle: ${data.role}`);

    const user = await authService.register(data);

    console.log(`✅ Inscription réussie - ID: ${user.id}, Email: ${user.email}, Rôle: ${user.role}`);
    successResponse(res, user, 'User registered successfully', 201);
  } catch (error) {
    console.error(`❌ Erreur d'inscription - Email: ${req.body.email}`, error);
    next(error);
  }
}

/**
 * Login user
 * POST /api/auth/login
 */
export async function login(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const data: LoginInput = req.body;
    console.log(`🔐 Tentative de connexion - Email: ${data.email}`);

    const result = await authService.login(data);

    console.log(`✅ Connexion réussie - Email: ${data.email}, Rôle: ${result.user.role}`);
    successResponse(res, result, 'Login successful');
  } catch (error) {
    console.error(`❌ Échec de connexion - Email: ${req.body.email}`);
    next(error);
  }
}

/**
 * Refresh access token
 * POST /api/auth/refresh
 */
export async function refresh(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { refreshToken }: RefreshTokenInput = req.body;
    console.log(`🔄 Tentative de rafraîchissement du token`);

    const tokens = await authService.refreshAccessToken(refreshToken);

    console.log(`✅ Token rafraîchi avec succès`);
    successResponse(res, tokens, 'Token refreshed successfully');
  } catch (error) {
    console.error(`❌ Échec du rafraîchissement du token`);
    next(error);
  }
}

/**
 * Get current user profile
 * GET /api/auth/me
 */
export async function getMe(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new Error('User not authenticated');
    }

    const profile = await authService.getUserProfile(req.user.id);

    successResponse(res, profile, 'Profile retrieved successfully');
  } catch (error) {
    next(error);
  }
}

/**
 * Register a new student (dedicated endpoint)
 * POST /api/auth/register/etudiant
 */
export async function registerEtudiant(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const data: RegisterEtudiantInput = req.body;
    console.log(`📝 Inscription étudiant - Email: ${data.email}`);

    const result = await authService.registerEtudiant(data);

    console.log(`✅ Étudiant inscrit avec succès - ID: ${result.user.id}`);
    successResponse(res, result, 'Inscription réussie !', 201);
  } catch (error) {
    console.error(`❌ Erreur inscription étudiant - Email: ${req.body.email}`, error);
    next(error);
  }
}

/**
 * Register a new teacher (dedicated endpoint)
 * POST /api/auth/register/enseignant
 */
export async function registerEnseignant(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const data: RegisterEnseignantInput = req.body;
    console.log(`📝 Inscription enseignant - Email: ${data.email}`);

    const result = await authService.registerEnseignant(data);

    console.log(`✅ Enseignant inscrit avec succès - ID: ${result.user.id}`);
    successResponse(res, result, 'Inscription réussie !', 201);
  } catch (error) {
    console.error(`❌ Erreur inscription enseignant - Email: ${req.body.email}`, error);
    next(error);
  }
}

/**
 * Change password
 * POST /api/auth/change-password
 */
export async function changePassword(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new Error('User not authenticated');
    }

    const data: ChangePasswordInput = req.body;
    const result = await authService.changePassword(req.user.id, data);

    successResponse(res, result, 'Password changed successfully');
  } catch (error) {
    next(error);
  }
}
