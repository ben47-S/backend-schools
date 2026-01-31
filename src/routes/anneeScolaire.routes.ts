/**
 * AnneeScolaire Routes
 * Defines all academic year-related endpoints
 */

import { Router } from 'express';
import * as anneeScolaireController from '../controllers/anneeScolaire.controller';
import { authenticateToken } from '../middlewares/auth.middleware';
import { requireRoles } from '../middlewares/rbac.middleware';
import { validateBody, validateParams } from '../middlewares/validate.middleware';
import {
  createAnneeScolaireSchema,
  updateAnneeScolaireSchema,
  anneeScolaireIdSchema,
} from '../schemas/anneeScolaire.schemas';

const router = Router();

/**
 * Public routes (avec authentification optionnelle pour les logs)
 */

/**
 * GET /api/annees/active - Get active academic year
 * Accessible to all authenticated users
 */
router.get(
  '/active',
  authenticateToken,
  anneeScolaireController.getActiveAnneeScolaire
);

/**
 * Protected routes (require authentication)
 */
router.use(authenticateToken);

/**
 * GET /api/annees - Get all academic years
 * All authenticated users can view
 */
router.get('/', anneeScolaireController.getAllAnneeScolaires);

/**
 * GET /api/annees/:id - Get academic year by ID
 * All authenticated users can view
 */
router.get(
  '/:id',
  validateParams(anneeScolaireIdSchema),
  anneeScolaireController.getAnneeScolaireById
);

/**
 * POST /api/annees - Create a new academic year
 * ADMIN_GLOBAL only
 */
router.post(
  '/',
  requireRoles('ADMIN_GLOBAL'),
  validateBody(createAnneeScolaireSchema),
  anneeScolaireController.createAnneeScolaire
);

/**
 * PUT /api/annees/:id - Update an academic year
 * ADMIN_GLOBAL only
 */
router.put(
  '/:id',
  requireRoles('ADMIN_GLOBAL'),
  validateParams(anneeScolaireIdSchema),
  validateBody(updateAnneeScolaireSchema),
  anneeScolaireController.updateAnneeScolaire
);

/**
 * POST /api/annees/:id/activate - Activate an academic year
 * ADMIN_GLOBAL only
 * Automatically deactivates all other years
 */
router.post(
  '/:id/activate',
  requireRoles('ADMIN_GLOBAL'),
  validateParams(anneeScolaireIdSchema),
  anneeScolaireController.activateAnneeScolaire
);

/**
 * POST /api/annees/:id/deactivate - Deactivate an academic year
 * ADMIN_GLOBAL only
 */
router.post(
  '/:id/deactivate',
  requireRoles('ADMIN_GLOBAL'),
  validateParams(anneeScolaireIdSchema),
  anneeScolaireController.deactivateAnneeScolaire
);

/**
 * DELETE /api/annees/:id - Delete an academic year
 * ADMIN_GLOBAL only
 * Cannot delete if it has related data
 */
router.delete(
  '/:id',
  requireRoles('ADMIN_GLOBAL'),
  validateParams(anneeScolaireIdSchema),
  anneeScolaireController.deleteAnneeScolaire
);

export default router;
