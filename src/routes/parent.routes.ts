/**
 * Parent Routes
 * Defines all parent-related endpoints
 */

import { Router } from 'express';
import * as parentController from '../controllers/parent.controller';
import { authenticateToken } from '../middlewares/auth.middleware';
import { requireAdmin } from '../middlewares/rbac.middleware';
import { validateBody, validateParams } from '../middlewares/validate.middleware';
import {
  createParentSchema,
  updateParentSchema,
  parentIdSchema,
  linkChildSchema,
  unlinkChildSchema,
} from '../schemas/parent.schemas';

const router = Router();

/**
 * All routes require authentication
 */
router.use(authenticateToken);

/**
 * GET /api/parents - Get all parents
 * All authenticated users can view (with college isolation)
 */
router.get('/', parentController.getAllParents);

/**
 * GET /api/parents/:id - Get parent by ID
 * All authenticated users can view
 */
router.get(
  '/:id',
  validateParams(parentIdSchema),
  parentController.getParentById
);

/**
 * POST /api/parents - Create a new parent
 * ADMIN_GLOBAL and ADMIN_COLLEGE
 */
router.post(
  '/',
  requireAdmin,
  validateBody(createParentSchema),
  parentController.createParent
);

/**
 * PUT /api/parents/:id - Update a parent
 * ADMIN_GLOBAL and ADMIN_COLLEGE (for parents with children in their college)
 */
router.put(
  '/:id',
  requireAdmin,
  validateParams(parentIdSchema),
  validateBody(updateParentSchema),
  parentController.updateParent
);

/**
 * DELETE /api/parents/:id - Delete a parent
 * ADMIN_GLOBAL and ADMIN_COLLEGE (for parents with children in their college)
 * Cannot delete if parent has children linked
 */
router.delete(
  '/:id',
  requireAdmin,
  validateParams(parentIdSchema),
  parentController.deleteParent
);

/**
 * POST /api/parents/:id/enfants - Link a child to parent
 * ADMIN_GLOBAL and ADMIN_COLLEGE
 */
router.post(
  '/:id/enfants',
  requireAdmin,
  validateParams(parentIdSchema),
  validateBody(linkChildSchema),
  parentController.linkChild
);

/**
 * DELETE /api/parents/:id/enfants - Unlink a child from parent
 * ADMIN_GLOBAL and ADMIN_COLLEGE
 */
router.delete(
  '/:id/enfants',
  requireAdmin,
  validateParams(parentIdSchema),
  validateBody(unlinkChildSchema),
  parentController.unlinkChild
);

export default router;
