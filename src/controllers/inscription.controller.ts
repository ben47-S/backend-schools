/**
 * Inscription Controller
 * Handles HTTP requests for student enrollment operations
 */

import type { Request, Response, NextFunction } from 'express';
import * as inscriptionService from '../services/inscription.service';
import { successResponse } from '../utils/response';

/**
 * GET /api/inscriptions
 * Get all inscriptions with optional filters
 */
export const getAllInscriptions = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { role, id: userId } = req.user!;
    const filters = req.query;
    const inscriptions = await inscriptionService.getAllInscriptions(
      role,
      userId,
      filters
    );
    successResponse(res, inscriptions, 'Inscriptions récupérées avec succès');
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/inscriptions/:id
 * Get inscription by ID
 */
export const getInscriptionById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { role, id: userId } = req.user!;
    const inscription = await inscriptionService.getInscriptionById(
      id,
      role,
      userId
    );
    successResponse(res, inscription, 'Inscription récupérée avec succès');
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/inscriptions
 * Create a new inscription
 */
export const createInscription = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { role, id: userId } = req.user!;
    const inscription = await inscriptionService.createInscription(
      req.body,
      role,
      userId
    );
    successResponse(res, inscription, 'Inscription créée avec succès', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/inscriptions/:id
 * Update an inscription
 */
export const updateInscription = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { role, id: userId } = req.user!;
    const inscription = await inscriptionService.updateInscription(
      id,
      req.body,
      role,
      userId
    );
    successResponse(res, inscription, 'Inscription mise à jour avec succès');
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/inscriptions/:id
 * Delete an inscription
 */
export const deleteInscription = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { role, id: userId } = req.user!;
    const result = await inscriptionService.deleteInscription(id, role, userId);
    successResponse(res, result);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/inscriptions/etudiant/:etudiantId
 * Get all inscriptions for a specific student
 */
export const getInscriptionsByStudent = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { etudiantId } = req.params;
    const { role, id: userId } = req.user!;
    const inscriptions = await inscriptionService.getInscriptionsByStudent(
      etudiantId,
      role,
      userId
    );
    successResponse(
      res,
      inscriptions,
      'Inscriptions de l\'étudiant récupérées avec succès'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/inscriptions/demandes
 * Student submits enrollment request
 */
export const createDemandeInscription = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id;
    const demande = await inscriptionService.createDemandeInscription(req.body, userId);
    successResponse(res, demande, 'Demande d\'inscription envoyée avec succès', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/inscriptions/:id/reponse
 * Admin responds to enrollment request
 */
export const repondreDemandeInscription = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const userRole = req.user!.role;
    const result = await inscriptionService.repondreDemandeInscription(id, req.body, userId, userRole);
    successResponse(res, result, 'Réponse à la demande enregistrée avec succès');
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/inscriptions/mes-demandes
 * Student views their own enrollment requests
 */
export const getMesDemandesInscription = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id;
    const demandes = await inscriptionService.getMesDemandesInscription(userId);
    successResponse(res, demandes, 'Vos demandes d\'inscription récupérées avec succès');
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/inscriptions/demandes-en-attente
 * Admin views pending enrollment requests
 */
export const getDemandesEnAttente = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id;
    const userRole = req.user!.role;
    const demandes = await inscriptionService.getDemandesEnAttente(userId, userRole);
    successResponse(res, demandes, 'Demandes en attente récupérées avec succès');
  } catch (error) {
    next(error);
  }
};
