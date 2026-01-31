/**
 * Salle Routes
 * Defines all classroom-related endpoints
 */

import { Router } from 'express';
import * as salleController from '../controllers/salle.controller';
import { authenticateToken } from '../middlewares/auth.middleware';
import { requireAdmin } from '../middlewares/rbac.middleware';
import { validateBody, validateParams } from '../middlewares/validate.middleware';
import {
  createSalleSchema,
  updateSalleSchema,
  salleIdSchema,
  getSallesByCollegeSchema,
} from '../schemas/salle.schemas';

const router = Router();

/**
 * All routes require authentication
 */
router.use(authenticateToken);

/**
 * GET /api/salles - Get all classrooms
 * All authenticated users can view (with college isolation)
 */
router.get('/', salleController.getAllSalles);

/**
 * GET /api/salles/college/:collegeId - Get classrooms by college
 * All authenticated users can view
 */
router.get(
  '/college/:collegeId',
  validateParams(getSallesByCollegeSchema),
  salleController.getSallesByCollege
);

/**
 * GET /api/salles/:id - Get classroom by ID
 * All authenticated users can view
 */
router.get(
  '/:id',
  validateParams(salleIdSchema),
  salleController.getSalleById
);

/**
 * POST /api/salles - Create a new classroom
 * ADMIN_GLOBAL and ADMIN_COLLEGE (for their college)
 */
router.post(
  '/',
  requireAdmin,
  validateBody(createSalleSchema),
  salleController.createSalle
);

/**
 * PUT /api/salles/:id - Update a classroom
 * ADMIN_GLOBAL and ADMIN_COLLEGE (for their college)
 */
router.put(
  '/:id',
  requireAdmin,
  validateParams(salleIdSchema),
  validateBody(updateSalleSchema),
  salleController.updateSalle
);

/**
 * DELETE /api/salles/:id - Delete a classroom
 * ADMIN_GLOBAL and ADMIN_COLLEGE (for their college)
 * Cannot delete if it has associated subjects
 */
router.delete(
  '/:id',
  requireAdmin,
  validateParams(salleIdSchema),
  salleController.deleteSalle
);

export default router;
