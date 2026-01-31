/**
 * Salle Controller
 * Request handlers for classroom endpoints
 */

import { Request, Response, NextFunction } from 'express';
import * as salleService from '../services/salle.service';
import { successResponse } from '../utils/response';

/**
 * GET /api/salles
 * Get all classrooms with college isolation
 */
export async function getAllSalles(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const salles = await salleService.getAllSalles(
      req.user!.id,
      req.user!.role
    );

    successResponse(res, salles, 'Salles récupérées avec succès');
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/salles/college/:collegeId
 * Get classrooms by college ID
 */
export async function getSallesByCollege(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { collegeId } = req.params;

    const salles = await salleService.getSallesByCollege(
      collegeId,
      req.user!.id,
      req.user!.role
    );

    successResponse(res, salles, 'Salles du collège récupérées avec succès');
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/salles/:id
 * Get a single classroom by ID
 */
export async function getSalleById(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;

    const salle = await salleService.getSalleById(
      id,
      req.user!.id,
      req.user!.role
    );

    successResponse(res, salle, 'Salle récupérée avec succès');
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/salles
 * Create a new classroom
 */
export async function createSalle(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const salle = await salleService.createSalle(
      req.body,
      req.user!.id,
      req.user!.role
    );

    successResponse(res, salle, 'Salle créée avec succès', 201);
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/salles/:id
 * Update a classroom
 */
export async function updateSalle(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;

    const salle = await salleService.updateSalle(
      id,
      req.body,
      req.user!.id,
      req.user!.role
    );

    successResponse(res, salle, 'Salle mise à jour avec succès');
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/salles/:id
 * Delete a classroom
 */
export async function deleteSalle(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;

    const result = await salleService.deleteSalle(
      id,
      req.user!.id,
      req.user!.role
    );

    successResponse(res, result);
  } catch (error) {
    next(error);
  }
}
