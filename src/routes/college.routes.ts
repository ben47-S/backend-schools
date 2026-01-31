/**
 * College Routes
 * Defines all college-related endpoints
 */

import { Router } from 'express';
import * as collegeController from '../controllers/college.controller';
import { authenticateToken } from '../middlewares/auth.middleware';
import { requireRoles, requireAdmin } from '../middlewares/rbac.middleware';
import { validateBody, validateParams } from '../middlewares/validate.middleware';
import {
  createCollegeSchema,
  updateCollegeSchema,
  collegeIdSchema,
} from '../schemas/college.schemas';

const router = Router();

/**
 * All routes require authentication
 */
router.use(authenticateToken);

/**
 * GET /api/colleges - Get all colleges
 * ADMIN_GLOBAL: all colleges
 * ADMIN_COLLEGE: their college only
 */
router.get(
  '/',
  requireAdmin, // ADMIN_GLOBAL or ADMIN_COLLEGE
  collegeController.getAllColleges
);

/**
 * GET /api/colleges/:id - Get college by ID
 * ADMIN_GLOBAL: any college
 * ADMIN_COLLEGE: their college only
 */
router.get(
  '/:id',
  requireAdmin,
  validateParams(collegeIdSchema),
  collegeController.getCollegeById
);

/**
 * POST /api/colleges - Create a new college
 * ADMIN_GLOBAL only
 */
router.post(
  '/',
  requireRoles('ADMIN_GLOBAL'),
  validateBody(createCollegeSchema),
  collegeController.createCollege
);

/**
 * PUT /api/colleges/:id - Update a college
 * ADMIN_GLOBAL: any college
 * ADMIN_COLLEGE: their college only
 */
router.put(
  '/:id',
  requireAdmin,
  validateParams(collegeIdSchema),
  validateBody(updateCollegeSchema),
  collegeController.updateCollege
);

/**
 * DELETE /api/colleges/:id - Delete a college
 * ADMIN_GLOBAL only
 */
router.delete(
  '/:id',
  requireRoles('ADMIN_GLOBAL'),
  validateParams(collegeIdSchema),
  collegeController.deleteCollege
);

export default router;
