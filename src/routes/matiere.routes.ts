/**
 * Matiere Routes
 * Defines all subject-related endpoints
 */

import { Router } from 'express';
import * as matiereController from '../controllers/matiere.controller';
import { authenticateToken } from '../middlewares/auth.middleware';
import { requireAdmin } from '../middlewares/rbac.middleware';
import { validateBody, validateParams } from '../middlewares/validate.middleware';
import {
  createMatiereSchema,
  updateMatiereSchema,
  matiereIdSchema,
  getMatieresByDepartementSchema,
} from '../schemas/matiere.schemas';

const router = Router();

/**
 * All routes require authentication
 */
router.use(authenticateToken);

/**
 * GET /api/matieres - Get all subjects
 * All authenticated users can view (with college isolation)
 */
router.get('/', matiereController.getAllMatieres);

/**
 * GET /api/matieres/departement/:departementId - Get subjects by department
 * All authenticated users can view
 */
router.get(
  '/departement/:departementId',
  validateParams(getMatieresByDepartementSchema),
  matiereController.getMatieresByDepartement
);

/**
 * GET /api/matieres/:id - Get subject by ID
 * All authenticated users can view
 */
router.get(
  '/:id',
  validateParams(matiereIdSchema),
  matiereController.getMatiereById
);

/**
 * POST /api/matieres - Create a new subject
 * ADMIN_GLOBAL and ADMIN_COLLEGE (for their college's departments)
 */
router.post(
  '/',
  requireAdmin,
  validateBody(createMatiereSchema),
  matiereController.createMatiere
);

/**
 * PUT /api/matieres/:id - Update a subject
 * ADMIN_GLOBAL and ADMIN_COLLEGE (for their college)
 */
router.put(
  '/:id',
  requireAdmin,
  validateParams(matiereIdSchema),
  validateBody(updateMatiereSchema),
  matiereController.updateMatiere
);

/**
 * DELETE /api/matieres/:id - Delete a subject
 * ADMIN_GLOBAL and ADMIN_COLLEGE (for their college)
 * Cannot delete if it has teachers, notes, or courses
 */
router.delete(
  '/:id',
  requireAdmin,
  validateParams(matiereIdSchema),
  matiereController.deleteMatiere
);

export default router;
