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
} from '../schemas/college.schemas';

/**
 * Get all colleges
 * GET /api/colleges
 */
export async function getAllColleges(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new Error('User not authenticated');
    }

    const colleges = await collegeService.getAllColleges(
      req.user.id,
      req.user.role
    );

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
 * Create a new college
 * POST /api/colleges
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

    const data: CreateCollegeInput = req.body;

    const college = await collegeService.createCollege(data, req.user.id);

    successResponse(res, college, 'College created successfully', 201);
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
