/**
 * Parent Controller
 * Handles HTTP requests for parent operations
 */

import type { Request, Response, NextFunction } from 'express';
import * as parentService from '../services/parent.service';
import { successResponse } from '../utils/response';

/**
 * GET /api/parents
 * Get all parents
 */
export const getAllParents = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { role, id: userId } = req.user!;
    const parents = await parentService.getAllParents(role, userId);
    successResponse(res, parents, 'Parents récupérés avec succès');
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/parents/:id
 * Get parent by ID
 */
export const getParentById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { role, id: userId } = req.user!;
    const parent = await parentService.getParentById(id, role, userId);
    successResponse(res, parent, 'Parent récupéré avec succès');
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/parents
 * Create a new parent
 */
export const createParent = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { role, id: userId } = req.user!;
    const parent = await parentService.createParent(req.body, role, userId);
    successResponse(res, parent, 'Parent créé avec succès', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/parents/:id
 * Update a parent
 */
export const updateParent = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { role, id: userId } = req.user!;
    const parent = await parentService.updateParent(id, req.body, role, userId);
    successResponse(res, parent, 'Parent mis à jour avec succès');
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/parents/:id
 * Delete a parent
 */
export const deleteParent = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { role, id: userId } = req.user!;
    const result = await parentService.deleteParent(id, role, userId);
    successResponse(res, result);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/parents/:id/enfants
 * Link a child to a parent
 */
export const linkChild = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { role, id: userId } = req.user!;
    const link = await parentService.linkChild(id, req.body, role, userId);
    successResponse(res, link, 'Enfant lié au parent avec succès', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/parents/:id/enfants
 * Unlink a child from a parent
 */
export const unlinkChild = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { role, id: userId } = req.user!;
    const result = await parentService.unlinkChild(id, req.body, role, userId);
    successResponse(res, result);
  } catch (error) {
    next(error);
  }
};
