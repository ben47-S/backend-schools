/**
 * Etudiant Routes
 * Defines all student-related endpoints
 */

import { Router } from 'express';
import * as etudiantController from '../controllers/etudiant.controller';
import { authenticateToken } from '../middlewares/auth.middleware';
import { requireAdmin } from '../middlewares/rbac.middleware';
import { validateBody, validateParams } from '../middlewares/validate.middleware';
import {
  createEtudiantWithUserSchema,
  createEtudiantSchema,
  updateEtudiantSchema,
  etudiantIdSchema,
} from '../schemas/etudiant.schemas';

const router = Router();

/**
 * All routes require authentication
 */
router.use(authenticateToken);

/**
 * GET /api/etudiants/me/inscriptions - Get current student's inscriptions
 * Must be before /:id to avoid route conflict
 */
router.get(
  '/me/inscriptions',
  etudiantController.getMesInscriptions
);

/**
 * GET /api/etudiants/me/notes - Get current student's notes
 * Must be before /:id to avoid route conflict
 */
router.get(
  '/me/notes',
  etudiantController.getMesNotes
);

/**
 * GET /api/etudiants - Get all students
 * All authenticated users can view (with college isolation)
 */
router.get('/', etudiantController.getAllEtudiants);

/**
 * GET /api/etudiants/:id - Get student by ID
 * All authenticated users can view
 */
router.get(
  '/:id',
  validateParams(etudiantIdSchema),
  etudiantController.getEtudiantById
);

// REMOVED: /create-user endpoint
// Students now self-register via /api/auth/register
// Enrollment happens via enrollment request workflow

/**
 * POST /api/etudiants/with-user - Create a new student with user account
 * ADMIN_GLOBAL and ADMIN_COLLEGE
 * Legacy endpoint - kept for compatibility
 */
router.post(
  '/with-user',
  requireAdmin,
  validateBody(createEtudiantWithUserSchema),
  etudiantController.createEtudiantWithUser
);

/**
 * POST /api/etudiants - Create a new student (for existing user)
 * ADMIN_GLOBAL and ADMIN_COLLEGE
 */
router.post(
  '/',
  requireAdmin,
  validateBody(createEtudiantSchema),
  etudiantController.createEtudiant
);

/**
 * PUT /api/etudiants/:id - Update a student
 * ADMIN_GLOBAL and ADMIN_COLLEGE (for students in their college)
 */
router.put(
  '/:id',
  requireAdmin,
  validateParams(etudiantIdSchema),
  validateBody(updateEtudiantSchema),
  etudiantController.updateEtudiant
);

/**
 * DELETE /api/etudiants/:id - Delete a student
 * ADMIN_GLOBAL and ADMIN_COLLEGE (for students in their college)
 * Cannot delete if student has enrollments or parents linked
 */
router.delete(
  '/:id',
  requireAdmin,
  validateParams(etudiantIdSchema),
  etudiantController.deleteEtudiant
);

export default router;
