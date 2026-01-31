/**
 * Departement Controller
 * Request handlers for department endpoints
 */

import { Request, Response, NextFunction } from 'express';
import * as departementService from '../services/departement.service';
import { successResponse } from '../utils/response';

/**
 * GET /api/departements
 * Get all departments with college isolation
 */
export async function getAllDepartements(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const departements = await departementService.getAllDepartements(
      req.user!.id,
      req.user!.role
    );

    successResponse(res, departements, 'Départements récupérés avec succès');
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/departements/college/:collegeId
 * Get departments by college ID
 */
export async function getDepartementsByCollege(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { collegeId } = req.params;

    const departements = await departementService.getDepartementsByCollege(
      collegeId,
      req.user!.id,
      req.user!.role
    );

    successResponse(res, departements, 'Départements du collège récupérés avec succès');
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/departements/:id
 * Get a single department by ID
 */
export async function getDepartementById(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;

    const departement = await departementService.getDepartementById(
      id,
      req.user!.id,
      req.user!.role
    );

    successResponse(res, departement, 'Département récupéré avec succès');
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/departements
 * Create a new department
 */
export async function createDepartement(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const departement = await departementService.createDepartement(
      req.body,
      req.user!.id,
      req.user!.role
    );

    successResponse(res, departement, 'Département créé avec succès', 201);
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/departements/:id
 * Update a department
 */
export async function updateDepartement(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;

    const departement = await departementService.updateDepartement(
      id,
      req.body,
      req.user!.id,
      req.user!.role
    );

    successResponse(res, departement, 'Département mis à jour avec succès');
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/departements/:id
 * Delete a department
 */
export async function deleteDepartement(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;

    const result = await departementService.deleteDepartement(
      id,
      req.user!.id,
      req.user!.role
    );

    successResponse(res, result);
  } catch (error) {
    next(error);
  }
}
