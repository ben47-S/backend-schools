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
  createCollegeWithAdminSchema,
  updateCollegeSchema,
  collegeIdSchema,
} from '../schemas/college.schemas';

const router = Router();

/**
 * GET /api/colleges - Get all colleges (PUBLIC - for registration)
 * When authenticated: ADMIN_GLOBAL gets all, ADMIN_COLLEGE gets their college only
 */
router.get(
  '/',
  collegeController.getAllColleges
);

/**
 * GET /api/colleges/:id - Get college by ID
 * ADMIN_GLOBAL: any college
 * ADMIN_COLLEGE: their college only
 */
router.get(
  '/:id',
  authenticateToken,
  requireAdmin,
  validateParams(collegeIdSchema),
  collegeController.getCollegeById
);

/**
 * POST /api/colleges - Create a new college with administrator
 * ADMIN_GLOBAL only
 * Creates both college and admin user in one operation
 */
router.post(
  '/',
  authenticateToken,
  requireRoles('ADMIN_GLOBAL'),
  validateBody(createCollegeWithAdminSchema),
  collegeController.createCollege
);

/**
 * PUT /api/colleges/:id - Update a college
 * ADMIN_GLOBAL: any college
 * ADMIN_COLLEGE: their college only
 */
router.put(
  '/:id',
  authenticateToken,
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
  authenticateToken,
  requireRoles('ADMIN_GLOBAL'),
  validateParams(collegeIdSchema),
  collegeController.deleteCollege
);

export default router;
