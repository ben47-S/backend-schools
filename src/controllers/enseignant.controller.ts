/**
 * Enseignant Controller
 * Request handlers for teacher endpoints
 */

import { Request, Response, NextFunction } from 'express';
import * as enseignantService from '../services/enseignant.service';
import { successResponse } from '../utils/response';

/**
 * GET /api/enseignants
 * Get all teachers with college isolation
 */
export async function getAllEnseignants(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const enseignants = await enseignantService.getAllEnseignants(
      req.user!.id,
      req.user!.role
    );

    successResponse(res, enseignants, 'Enseignants récupérés avec succès');
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/enseignants/:id
 * Get a single teacher by ID
 */
export async function getEnseignantById(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;

    const enseignant = await enseignantService.getEnseignantById(
      id,
      req.user!.id,
      req.user!.role
    );

    successResponse(res, enseignant, 'Enseignant récupéré avec succès');
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/enseignants
 * Create a new teacher
 */
export async function createEnseignant(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const enseignant = await enseignantService.createEnseignant(
      req.body,
      req.user!.id,
      req.user!.role
    );

    successResponse(res, enseignant, 'Enseignant créé avec succès', 201);
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/enseignants/:id
 * Update a teacher
 */
export async function updateEnseignant(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;

    const enseignant = await enseignantService.updateEnseignant(
      id,
      req.body,
      req.user!.id,
      req.user!.role
    );

    successResponse(res, enseignant, 'Enseignant mis à jour avec succès');
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/enseignants/:id
 * Delete a teacher
 */
export async function deleteEnseignant(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;

    const result = await enseignantService.deleteEnseignant(
      id,
      req.user!.id,
      req.user!.role
    );

    successResponse(res, result);
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/enseignants/:id/departements
 * Assign teacher to a department
 */
export async function assignDepartement(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;

    const assignment = await enseignantService.assignDepartement(
      id,
      req.body,
      req.user!.id,
      req.user!.role
    );

    successResponse(res, assignment, 'Enseignant affecté au département avec succès', 201);
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/enseignants/:id/departements
 * Remove teacher from a department
 */
export async function removeDepartement(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;

    const result = await enseignantService.removeDepartement(
      id,
      req.body,
      req.user!.id,
      req.user!.role
    );

    successResponse(res, result);
  } catch (error) {
    next(error);
  }
}
