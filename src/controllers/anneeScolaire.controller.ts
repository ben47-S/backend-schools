/**
 * AnneeScolaire Controller
 * HTTP request handlers for academic year routes
 */

import { Request, Response, NextFunction } from 'express';
import * as anneeScolaireService from '../services/anneeScolaire.service';
import { successResponse } from '../utils/response';
import type {
  CreateAnneeScolaireInput,
  UpdateAnneeScolaireInput,
} from '../schemas/anneeScolaire.schemas';

/**
 * Get all academic years
 * GET /api/annees
 */
export async function getAllAnneeScolaires(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new Error('User not authenticated');
    }

    const annees = await anneeScolaireService.getAllAnneeScolaires(req.user.id);

    successResponse(res, annees);
  } catch (error) {
    next(error);
  }
}

/**
 * Get active academic year
 * GET /api/annees/active
 */
export async function getActiveAnneeScolaire(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.id;

    const annee = await anneeScolaireService.getActiveAnneeScolaire(userId);

    successResponse(res, annee);
  } catch (error) {
    next(error);
  }
}

/**
 * Get academic year by ID
 * GET /api/annees/:id
 */
export async function getAnneeScolaireById(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new Error('User not authenticated');
    }

    const { id } = req.params;

    const annee = await anneeScolaireService.getAnneeScolaireById(
      id,
      req.user.id
    );

    successResponse(res, annee);
  } catch (error) {
    next(error);
  }
}

/**
 * Create a new academic year
 * POST /api/annees
 */
export async function createAnneeScolaire(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new Error('User not authenticated');
    }

    const data: CreateAnneeScolaireInput = req.body;

    const annee = await anneeScolaireService.createAnneeScolaire(
      data,
      req.user.id
    );

    successResponse(res, annee, 'Année scolaire créée avec succès', 201);
  } catch (error) {
    next(error);
  }
}

/**
 * Update an academic year
 * PUT /api/annees/:id
 */
export async function updateAnneeScolaire(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new Error('User not authenticated');
    }

    const { id } = req.params;
    const data: UpdateAnneeScolaireInput = req.body;

    const annee = await anneeScolaireService.updateAnneeScolaire(
      id,
      data,
      req.user.id
    );

    successResponse(res, annee, 'Année scolaire mise à jour avec succès');
  } catch (error) {
    next(error);
  }
}

/**
 * Activate an academic year
 * POST /api/annees/:id/activate
 */
export async function activateAnneeScolaire(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new Error('User not authenticated');
    }

    const { id } = req.params;

    const annee = await anneeScolaireService.activateAnneeScolaire(
      id,
      req.user.id
    );

    successResponse(res, annee, 'Année scolaire activée avec succès');
  } catch (error) {
    next(error);
  }
}

/**
 * Deactivate an academic year
 * POST /api/annees/:id/deactivate
 */
export async function deactivateAnneeScolaire(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new Error('User not authenticated');
    }

    const { id } = req.params;

    const annee = await anneeScolaireService.deactivateAnneeScolaire(
      id,
      req.user.id
    );

    successResponse(res, annee, 'Année scolaire désactivée avec succès');
  } catch (error) {
    next(error);
  }
}

/**
 * Delete an academic year
 * DELETE /api/annees/:id
 */
export async function deleteAnneeScolaire(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new Error('User not authenticated');
    }

    const { id } = req.params;

    const result = await anneeScolaireService.deleteAnneeScolaire(
      id,
      req.user.id
    );

    successResponse(res, result, 'Année scolaire supprimée avec succès');
  } catch (error) {
    next(error);
  }
}
