/**
 * Enseignant Routes
 * Defines all teacher-related endpoints
 */

import { Router } from 'express';
import { z } from 'zod';
import * as enseignantController from '../controllers/enseignant.controller';
import { authenticateToken } from '../middlewares/auth.middleware';
import { requireAdmin } from '../middlewares/rbac.middleware';
import { validateBody, validateParams } from '../middlewares/validate.middleware';
import {
  createEnseignantSchema,
  updateEnseignantSchema,
  enseignantIdSchema,
  assignDepartementSchema,
  removeDepartementSchema,
  createEnseignantDemandeSchema,
  repondreDemandeSchema,
  enseignantDemandeIdSchema,
} from '../schemas/enseignant.schemas';

const router = Router();

/**
 * All routes require authentication
 */
router.use(authenticateToken);

/**
 * GET /api/enseignants/me - Get current teacher profile with demands
 * Must be before /:id to avoid route conflict
 */
router.get('/me', enseignantController.getMe);

/**
 * GET /api/enseignants/me/demandes - Get current teacher's demands
 * Must be before /:id to avoid route conflict
 */
router.get('/me/demandes', enseignantController.getMesDemandes);

/**
 * GET /api/enseignants - Get all teachers
 * All authenticated users can view (with college isolation)
 */
router.get('/', enseignantController.getAllEnseignants);

/**
 * GET /api/enseignants/:id - Get teacher by ID
 * All authenticated users can view
 */
router.get(
  '/:id',
  validateParams(enseignantIdSchema),
  enseignantController.getEnseignantById
);

/**
 * POST /api/enseignants - Create a new teacher
 * ADMIN_GLOBAL and ADMIN_COLLEGE
 */
router.post(
  '/',
  requireAdmin,
  validateBody(createEnseignantSchema),
  enseignantController.createEnseignant
);

/**
 * PUT /api/enseignants/:id - Update a teacher
 * ADMIN_GLOBAL and ADMIN_COLLEGE (for teachers in their college)
 */
router.put(
  '/:id',
  requireAdmin,
  validateParams(enseignantIdSchema),
  validateBody(updateEnseignantSchema),
  enseignantController.updateEnseignant
);

/**
 * DELETE /api/enseignants/:id - Delete a teacher
 * ADMIN_GLOBAL and ADMIN_COLLEGE (for teachers in their college)
 * Cannot delete if teacher has courses
 */
router.delete(
  '/:id',
  requireAdmin,
  validateParams(enseignantIdSchema),
  enseignantController.deleteEnseignant
);

/**
 * POST /api/enseignants/:id/departements - Assign teacher to department
 * ADMIN_GLOBAL and ADMIN_COLLEGE (for their college's departments)
 */
router.post(
  '/:id/departements',
  requireAdmin,
  validateParams(enseignantIdSchema),
  validateBody(assignDepartementSchema),
  enseignantController.assignDepartement
);

/**
 * DELETE /api/enseignants/:id/departements - Remove teacher from department
 * ADMIN_GLOBAL and ADMIN_COLLEGE (for their college's departments)
 */
router.delete(
  '/:id/departements',
  requireAdmin,
  validateParams(enseignantIdSchema),
  validateBody(removeDepartementSchema),
  enseignantController.removeDepartement
);

/**
 * GET /api/enseignants/:id/demandes - Get all demands for a teacher
 * Admin or the teacher themselves
 */
router.get(
  '/:id/demandes',
  validateParams(enseignantIdSchema),
  enseignantController.getDemandesForTeacher
);

/**
 * POST /api/enseignants/:id/demandes - Admin sends a demand to teacher for a department
 * ADMIN_GLOBAL and ADMIN_COLLEGE
 */
router.post(
  '/:id/demandes',
  requireAdmin,
  validateParams(enseignantIdSchema),
  validateBody(createEnseignantDemandeSchema),
  enseignantController.createDemande
);

/**
 * PATCH /api/enseignants/:id/demandes/:demandeId - Teacher responds to demand (accept/refuse)
 * Teacher must respond to their own demands
 */
router.patch(
  '/:id/demandes/:demandeId',
  validateParams(z.object({ id: z.string().uuid(), demandeId: z.string().uuid() })),
  validateBody(repondreDemandeSchema),
  enseignantController.repondreDemande
);

export default router;
