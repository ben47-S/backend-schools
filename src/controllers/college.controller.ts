/**
 * College Controller
 * HTTP request handlers for college routes
 */

import { Request, Response, NextFunction } from 'express';
import * as collegeService from '../services/college.service';
import { successResponse } from '../utils/response';
import type {
  CreateCollegeInput,
  UpdateCollegeInput,
  CreateCollegeWithAdminInput,
} from '../schemas/college.schemas';

/**
 * Get all colleges
 * GET /api/colleges
 * PUBLIC route (for registration) - filters by role if authenticated
 */
export async function getAllColleges(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // If user is authenticated, filter by role
    // If not authenticated (registration), return all colleges
    const colleges = req.user
      ? await collegeService.getAllColleges(req.user.id, req.user.role)
      : await collegeService.getAllCollegesPublic();

    successResponse(res, colleges);
  } catch (error) {
    next(error);
  }
}

/**
 * Get college by ID
 * GET /api/colleges/:id
 */
export async function getCollegeById(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new Error('User not authenticated');
    }

    const { id } = req.params;

    const college = await collegeService.getCollegeById(
      id,
      req.user.id,
      req.user.role
    );

    successResponse(res, college);
  } catch (error) {
    next(error);
  }
}

/**
 * Create a new college with its administrator
 * POST /api/colleges
 * Creates both the college and its admin user in one operation
 */
export async function createCollege(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new Error('User not authenticated');
    }

    const data: CreateCollegeWithAdminInput = req.body;

    const college = await collegeService.createCollegeWithAdmin(
      data,
      req.user.id
    );

    successResponse(
      res,
      college,
      'College and administrator created successfully',
      201
    );
  } catch (error) {
    next(error);
  }
}

/**
 * Update a college
 * PUT /api/colleges/:id
 */
export async function updateCollege(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new Error('User not authenticated');
    }

    const { id } = req.params;
    const data: UpdateCollegeInput = req.body;

    const college = await collegeService.updateCollege(
      id,
      data,
      req.user.id,
      req.user.role
    );

    successResponse(res, college, 'College updated successfully');
  } catch (error) {
    next(error);
  }
}

/**
 * Delete a college
 * DELETE /api/colleges/:id
 */
export async function deleteCollege(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new Error('User not authenticated');
    }

    const { id } = req.params;

    const result = await collegeService.deleteCollege(id, req.user.id);

    successResponse(res, result, 'College deleted successfully');
  } catch (error) {
    next(error);
  }
}

/**
 * Get my college (for current admin)
 * GET /api/admin-college/me
 * Returns the college the current admin is assigned to
 */
export async function getMyCollege(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new Error('User not authenticated');
    }

    const college = await collegeService.getMyCollege(req.user.id);

    successResponse(res, college, 'College retrieved successfully');
  } catch (error) {
    next(error);
  }
}
