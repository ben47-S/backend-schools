/**
 * Etudiant Controller
 * Handles HTTP requests for student operations
 */

import type { Request, Response, NextFunction } from 'express';
import * as etudiantService from '../services/etudiant.service';
import { successResponse } from '../utils/response';

/**
 * GET /api/etudiants/me/inscriptions
 * Get current student's inscriptions
 */
export const getMesInscriptions = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id;
    const inscriptions = await etudiantService.getMesInscriptions(userId);
    successResponse(res, inscriptions, 'Vos inscriptions récupérées avec succès');
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/etudiants/me/notes
 * Get current student's notes
 */
export const getMesNotes = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id;
    const anneeScolaireId = req.query.anneeScolaireId as string | undefined;
    const notes = await etudiantService.getMesNotes(userId, anneeScolaireId);
    successResponse(res, notes, 'Vos notes récupérées avec succès');
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/etudiants
 * Get all students
 */
export const getAllEtudiants = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { role, id: userId } = req.user!;
    const etudiants = await etudiantService.getAllEtudiants(role, userId);
    successResponse(res, etudiants, 'Étudiants récupérés avec succès');
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/etudiants/:id
 * Get student by ID
 */
export const getEtudiantById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { role, id: userId } = req.user!;
    const etudiant = await etudiantService.getEtudiantById(id, role, userId);
    successResponse(res, etudiant, 'Étudiant récupéré avec succès');
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/etudiants/create-user
 * Create a new user with profile (generic - supports ETUDIANT, ENSEIGNANT, PARENT)
 */
export const createUserWithProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id: userId, role: userRole } = req.user!;
    const profile = await etudiantService.createUserWithProfile(
      req.body,
      userId,
      userRole
    );
    const role = req.body.role;
    const message = role === 'ETUDIANT' ? 'Étudiant créé avec succès' :
                    role === 'ENSEIGNANT' ? 'Enseignant créé avec succès' :
                    'Parent créé avec succès';
    successResponse(res, profile, message, 201);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/etudiants/with-user
 * Create a new student with user account
 */
export const createEtudiantWithUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id: userId } = req.user!;
    const etudiant = await etudiantService.createEtudiantWithUser(
      req.body,
      userId
    );
    successResponse(res, etudiant, 'Étudiant créé avec succès', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/etudiants
 * Create a new student (for existing user)
 */
export const createEtudiant = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { role, id: userId } = req.user!;
    const etudiant = await etudiantService.createEtudiant(
      req.body,
      role,
      userId
    );
    successResponse(res, etudiant, 'Étudiant créé avec succès', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/etudiants/:id
 * Update a student
 */
export const updateEtudiant = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { role, id: userId } = req.user!;
    const etudiant = await etudiantService.updateEtudiant(
      id,
      req.body,
      role,
      userId
    );
    successResponse(res, etudiant, 'Étudiant mis à jour avec succès');
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/etudiants/:id
 * Delete a student
 */
export const deleteEtudiant = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { role, id: userId } = req.user!;
    const result = await etudiantService.deleteEtudiant(id, role, userId);
    successResponse(res, result);
  } catch (error) {
    next(error);
  }
};
