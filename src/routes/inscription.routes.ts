/**
 * Inscription Routes
 * Defines all student enrollment endpoints
 */

import { Router } from 'express';
import * as inscriptionController from '../controllers/inscription.controller';
import { authenticateToken } from '../middlewares/auth.middleware';
import { requireAdmin } from '../middlewares/rbac.middleware';
import { validateBody, validateParams, validateQuery } from '../middlewares/validate.middleware';
import {
  createInscriptionSchema,
  updateInscriptionSchema,
  inscriptionIdSchema,
  inscriptionFiltersSchema,
} from '../schemas/inscription.schemas';
import { z } from 'zod';

const router = Router();

/**
 * All routes require authentication
 */
router.use(authenticateToken);

/**
 * GET /api/inscriptions/etudiant/:etudiantId - Get inscriptions for a student
 * Must be defined BEFORE /:id to avoid route conflict
 * All authenticated users can view
 */
router.get(
  '/etudiant/:etudiantId',
  validateParams(z.object({ etudiantId: z.string().uuid() })),
  inscriptionController.getInscriptionsByStudent
);

/**
 * GET /api/inscriptions - Get all inscriptions (with optional filters)
 * All authenticated users can view (with college isolation)
 */
router.get(
  '/',
  validateQuery(inscriptionFiltersSchema),
  inscriptionController.getAllInscriptions
);

/**
 * GET /api/inscriptions/:id - Get inscription by ID
 * All authenticated users can view
 */
router.get(
  '/:id',
  validateParams(inscriptionIdSchema),
  inscriptionController.getInscriptionById
);

/**
 * POST /api/inscriptions - Create a new inscription
 * ADMIN_GLOBAL and ADMIN_COLLEGE
 */
router.post(
  '/',
  requireAdmin,
  validateBody(createInscriptionSchema),
  inscriptionController.createInscription
);

/**
 * PUT /api/inscriptions/:id - Update an inscription
 * ADMIN_GLOBAL and ADMIN_COLLEGE (for inscriptions in their college)
 */
router.put(
  '/:id',
  requireAdmin,
  validateParams(inscriptionIdSchema),
  validateBody(updateInscriptionSchema),
  inscriptionController.updateInscription
);

/**
 * DELETE /api/inscriptions/:id - Delete an inscription
 * ADMIN_GLOBAL and ADMIN_COLLEGE (for inscriptions in their college)
 * Cannot delete if student has notes for this year
 */
router.delete(
  '/:id',
  requireAdmin,
  validateParams(inscriptionIdSchema),
  inscriptionController.deleteInscription
);

export default router;
