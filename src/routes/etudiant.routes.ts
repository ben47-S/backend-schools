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

/**
 * POST /api/etudiants - Create a new student
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
