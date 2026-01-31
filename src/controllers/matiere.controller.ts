/**
 * Matiere Controller
 * Request handlers for subject endpoints
 */

import { Request, Response, NextFunction } from 'express';
import * as matiereService from '../services/matiere.service';
import { successResponse } from '../utils/response';

/**
 * GET /api/matieres
 * Get all subjects with college isolation
 */
export async function getAllMatieres(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const matieres = await matiereService.getAllMatieres(
      req.user!.id,
      req.user!.role
    );

    successResponse(res, matieres, 'Matières récupérées avec succès');
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/matieres/departement/:departementId
 * Get subjects by department ID
 */
export async function getMatieresByDepartement(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { departementId } = req.params;

    const matieres = await matiereService.getMatieresByDepartement(
      departementId,
      req.user!.id,
      req.user!.role
    );

    successResponse(res, matieres, 'Matières du département récupérées avec succès');
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/matieres/:id
 * Get a single subject by ID
 */
export async function getMatiereById(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;

    const matiere = await matiereService.getMatiereById(
      id,
      req.user!.id,
      req.user!.role
    );

    successResponse(res, matiere, 'Matière récupérée avec succès');
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/matieres
 * Create a new subject
 */
export async function createMatiere(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const matiere = await matiereService.createMatiere(
      req.body,
      req.user!.id,
      req.user!.role
    );

    successResponse(res, matiere, 'Matière créée avec succès', 201);
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/matieres/:id
 * Update a subject
 */
export async function updateMatiere(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;

    const matiere = await matiereService.updateMatiere(
      id,
      req.body,
      req.user!.id,
      req.user!.role
    );

    successResponse(res, matiere, 'Matière mise à jour avec succès');
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/matieres/:id
 * Delete a subject
 */
export async function deleteMatiere(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;

    const result = await matiereService.deleteMatiere(
      id,
      req.user!.id,
      req.user!.role
    );

    successResponse(res, result);
  } catch (error) {
    next(error);
  }
}
