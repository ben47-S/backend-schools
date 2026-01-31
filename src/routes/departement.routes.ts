/**
 * Departement Routes
 * Defines all department-related endpoints
 */

import { Router } from 'express';
import * as departementController from '../controllers/departement.controller';
import { authenticateToken } from '../middlewares/auth.middleware';
import { requireRoles, requireAdmin } from '../middlewares/rbac.middleware';
import { validateBody, validateParams } from '../middlewares/validate.middleware';
import {
  createDepartementSchema,
  updateDepartementSchema,
  departementIdSchema,
  getDepartementsByCollegeSchema,
} from '../schemas/departement.schemas';

const router = Router();

/**
 * All routes require authentication
 */
router.use(authenticateToken);

/**
 * GET /api/departements - Get all departments
 * All authenticated users can view (with college isolation)
 */
router.get('/', departementController.getAllDepartements);

/**
 * GET /api/departements/college/:collegeId - Get departments by college
 * All authenticated users can view
 */
router.get(
  '/college/:collegeId',
  validateParams(getDepartementsByCollegeSchema),
  departementController.getDepartementsByCollege
);

/**
 * GET /api/departements/:id - Get department by ID
 * All authenticated users can view
 */
router.get(
  '/:id',
  validateParams(departementIdSchema),
  departementController.getDepartementById
);

/**
 * POST /api/departements - Create a new department
 * ADMIN_GLOBAL and ADMIN_COLLEGE (for their college)
 */
router.post(
  '/',
  requireAdmin,
  validateBody(createDepartementSchema),
  departementController.createDepartement
);

/**
 * PUT /api/departements/:id - Update a department
 * ADMIN_GLOBAL and ADMIN_COLLEGE (for their college)
 */
router.put(
  '/:id',
  requireAdmin,
  validateParams(departementIdSchema),
  validateBody(updateDepartementSchema),
  departementController.updateDepartement
);

/**
 * DELETE /api/departements/:id - Delete a department
 * ADMIN_GLOBAL and ADMIN_COLLEGE (for their college)
 * Cannot delete if it has teachers or subjects
 */
router.delete(
  '/:id',
  requireAdmin,
  validateParams(departementIdSchema),
  departementController.deleteDepartement
);

export default router;
