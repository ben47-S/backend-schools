/**
 * Note Controller
 * HTTP request handlers for grade management
 */

import { Request, Response, NextFunction } from 'express';
import { noteService } from '../services';
import { successResponse } from '../utils/response';
import type { NoteFilters } from '../schemas/note.schemas';

/**
 * Get all notes with optional filters
 * GET /api/notes
 * Query params: collegeId?, anneeScolaireId?, etudiantId?, matiereId?
 */
export const getAllNotes = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { role, id: userId } = req.user!;
    const filters = req.query as NoteFilters;

    const notes = await noteService.getAllNotes(role, userId, filters);
    successResponse(res, notes, undefined, 200);
  } catch (error) {
    next(error);
  }
};

/**
 * Get note by ID
 * GET /api/notes/:id
 */
export const getNoteById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { role, id: userId } = req.user!;
    const { id } = req.params;

    const note = await noteService.getNoteById(id, role, userId);
    successResponse(res, note, undefined, 200);
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new note
 * POST /api/notes
 */
export const createNote = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { role, id: userId } = req.user!;

    const note = await noteService.createNote(req.body, role, userId);
    successResponse(res, note, 'Note créée avec succès', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * Update a note
 * PUT /api/notes/:id
 */
export const updateNote = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { role, id: userId } = req.user!;
    const { id } = req.params;

    const note = await noteService.updateNote(id, req.body, role, userId);
    successResponse(res, note, 'Note modifiée avec succès', 200);
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a note
 * DELETE /api/notes/:id
 */
export const deleteNote = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { role, id: userId } = req.user!;
    const { id } = req.params;

    const result = await noteService.deleteNote(id, role, userId);
    successResponse(res, result, result.message, 200);
  } catch (error) {
    next(error);
  }
};

/**
 * Get student statistics for an academic year
 * GET /api/notes/statistiques/:etudiantId/:anneeScolaireId
 */
export const getStudentStatistics = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { role, id: userId } = req.user!;
    const { etudiantId, anneeScolaireId } = req.params;

    const statistics = await noteService.getStudentStatistics(
      etudiantId,
      anneeScolaireId,
      role,
      userId
    );
    successResponse(res, statistics, undefined, 200);
  } catch (error) {
    next(error);
  }
};
