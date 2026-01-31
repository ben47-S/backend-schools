/**
 * Etudiant Controller
 * Handles HTTP requests for student operations
 */

import type { Request, Response, NextFunction } from 'express';
import * as etudiantService from '../services/etudiant.service';
import { successResponse } from '../utils/response';

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
 * POST /api/etudiants
 * Create a new student
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
