/**
 * Note Routes
 * API endpoints for grade management
 */

import { Router } from 'express';
import { noteController } from '../controllers';
import { authenticateToken } from '../middlewares/auth.middleware';
import { requireRoles } from '../middlewares/rbac.middleware';
import { validateBody, validateParams, validateQuery } from '../middlewares/validate.middleware';
import {
  createNoteSchema,
  updateNoteSchema,
  noteIdParamSchema,
  noteFiltersSchema,
  etudiantIdParamSchema,
} from '../schemas';
import { z } from 'zod';

const router = Router();

/**
 * All note routes require authentication
 */
router.use(authenticateToken);

/**
 * GET /api/notes/statistiques/:etudiantId/:anneeScolaireId
 * Get student statistics for an academic year
 * Access: All authenticated users (with role-based filtering in service)
 */
router.get(
  '/statistiques/:etudiantId/:anneeScolaireId',
  validateParams(
    z.object({
      etudiantId: z.string().uuid('ID étudiant invalide'),
      anneeScolaireId: z.string().uuid('ID année scolaire invalide'),
    })
  ),
  noteController.getStudentStatistics
);

/**
 * GET /api/notes
 * Get all notes with optional filters
 * Access: All authenticated users (with role-based filtering in service)
 * Query params: collegeId?, anneeScolaireId?, etudiantId?, matiereId?
 */
router.get(
  '/',
  validateQuery(noteFiltersSchema),
  noteController.getAllNotes
);

/**
 * GET /api/notes/:id
 * Get note by ID
 * Access: All authenticated users (with role-based access control in service)
 */
router.get(
  '/:id',
  validateParams(noteIdParamSchema),
  noteController.getNoteById
);

/**
 * POST /api/notes
 * Create a new note
 * Access: ADMIN_GLOBAL, ADMIN_COLLEGE, ENSEIGNANT
 */
router.post(
  '/',
  requireRoles('ADMIN_GLOBAL', 'ADMIN_COLLEGE', 'ENSEIGNANT'),
  validateBody(createNoteSchema),
  noteController.createNote
);

/**
 * PUT /api/notes/:id
 * Update a note
 * Access: ADMIN_GLOBAL, ADMIN_COLLEGE, ENSEIGNANT
 */
router.put(
  '/:id',
  requireRoles('ADMIN_GLOBAL', 'ADMIN_COLLEGE', 'ENSEIGNANT'),
  validateParams(noteIdParamSchema),
  validateBody(updateNoteSchema),
  noteController.updateNote
);

/**
 * DELETE /api/notes/:id
 * Delete a note
 * Access: ADMIN_GLOBAL, ADMIN_COLLEGE, ENSEIGNANT
 */
router.delete(
  '/:id',
  requireRoles('ADMIN_GLOBAL', 'ADMIN_COLLEGE', 'ENSEIGNANT'),
  validateParams(noteIdParamSchema),
  noteController.deleteNote
);

export default router;
