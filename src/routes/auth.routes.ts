/**
 * Authentication Routes
 * Defines all auth-related endpoints
 */

import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { validateBody } from '../middlewares/validate.middleware';
import { authenticateToken } from '../middlewares/auth.middleware';
import {
  loginSchema,
  registerSchema,
  refreshTokenSchema,
  changePasswordSchema,
  registerEtudiantSchema,
  registerEnseignantSchema,
} from '../schemas/auth.schemas';

const router = Router();

/**
 * Public routes
 */

// POST /api/auth/register - Register new user
router.post(
  '/register',
  validateBody(registerSchema),
  authController.register
);

// POST /api/auth/register/etudiant - Register new student (dedicated endpoint)
router.post(
  '/register/etudiant',
  validateBody(registerEtudiantSchema),
  authController.registerEtudiant
);

// POST /api/auth/register/enseignant - Register new teacher (dedicated endpoint)
router.post(
  '/register/enseignant',
  validateBody(registerEnseignantSchema),
  authController.registerEnseignant
);

// POST /api/auth/login - Login user
router.post(
  '/login',
  validateBody(loginSchema),
  authController.login
);

// POST /api/auth/refresh - Refresh access token
router.post(
  '/refresh',
  validateBody(refreshTokenSchema),
  authController.refresh
);

/**
 * Protected routes (require authentication)
 */

// GET /api/auth/me - Get current user profile
router.get(
  '/me',
  authenticateToken,
  authController.getMe
);

// POST /api/auth/change-password - Change password
router.post(
  '/change-password',
  authenticateToken,
  validateBody(changePasswordSchema),
  authController.changePassword
);

export default router;
