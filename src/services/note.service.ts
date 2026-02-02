/**
 * Note Service
 * Business logic for grade management with academic year isolation
 */

import { prisma } from '../lib/prisma';
import {
  NotFoundError,
  ConflictError,
  ForbiddenError,
  BadRequestError,
} from '../utils/errors';
import type {
  CreateNoteInput,
  UpdateNoteInput,
  NoteFilters,
} from '../schemas/note.schemas';

/**
 * Get all notes with optional filters
 * ADMIN_GLOBAL: sees all notes
 * ADMIN_COLLEGE: sees only notes in their college
 * ENSEIGNANT: sees notes for their subjects
 * ETUDIANT: sees only their own notes
 * PARENT: sees their children's notes
 */
export const getAllNotes = async (
  userRole: string,
  userId: string,
  filters: NoteFilters = {}
) => {
  // Build where clause based on role and filters
  let whereClause: any = {};

  // Apply role-based filtering
  if (userRole === 'ADMIN_COLLEGE') {
    // Get admin's college
    const adminCollege = await prisma.admin_colleges.findUnique({
      where: { userId },
      select: { collegeId: true },
    });

    if (!adminCollege) {
      throw new ForbiddenError('Admin college record not found');
    }

    // Filter notes via inscription.collegeId
    whereClause.etudiant = {
      inscriptions: {
        some: {
          collegeId: adminCollege.collegeId,
          anneeScolaireId: filters.anneeScolaireId || undefined,
        },
      },
    };
  } else if (userRole === 'ENSEIGNANT') {
    // Get teacher's subjects
    const enseignant = await prisma.enseignants.findUnique({
      where: { userId },
      select: {
        matieres: {
          select: { id: true },
        },
      },
    });

    if (!enseignant) {
      throw new ForbiddenError('Enseignant record not found');
    }

    const matiereIds = enseignant.matieres.map((m) => m.id);
    whereClause.matiereId = { in: matiereIds };
  } else if (userRole === 'ETUDIANT') {
    // Student can only see their own notes
    const etudiant = await prisma.etudiants.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!etudiant) {
      throw new ForbiddenError('Étudiant record not found');
    }

    whereClause.etudiantId = etudiant.id;
  } else if (userRole === 'PARENT') {
    // Parent can see their children's notes
    const parent = await prisma.parents.findUnique({
      where: { userId },
      include: {
        enfants: {
          select: { id: true },
        },
      },
    });

    if (!parent) {
      throw new ForbiddenError('Parent record not found');
    }

    const enfantIds = parent.enfants.map((e) => e.id);
    whereClause.etudiantId = { in: enfantIds };
  }

  // Apply user-provided filters
  if (filters.etudiantId) {
    // For ADMIN_COLLEGE, ensure student is in their college
    if (userRole === 'ADMIN_COLLEGE') {
      const adminCollege = await prisma.admin_colleges.findUnique({
        where: { userId },
        select: { collegeId: true },
      });

      const studentInCollege = await prisma.inscriptions.findFirst({
        where: {
          etudiantId: filters.etudiantId,
          collegeId: adminCollege?.collegeId,
        },
      });

      if (!studentInCollege) {
        throw new ForbiddenError('Cet étudiant n\'est pas dans votre collège');
      }
    }

    // Override or combine with existing etudiantId filter
    whereClause.etudiantId = filters.etudiantId;
  }

  if (filters.matiereId) {
    // For ENSEIGNANT, ensure they teach this subject
    if (userRole === 'ENSEIGNANT') {
      const enseignant = await prisma.enseignants.findUnique({
        where: { userId },
        include: {
          matieres: {
            where: { id: filters.matiereId },
          },
        },
      });

      if (!enseignant || enseignant.matieres.length === 0) {
        throw new ForbiddenError('Vous n\'enseignez pas cette matière');
      }
    }

    whereClause.matiereId = filters.matiereId;
  }

  if (filters.anneeScolaireId) {
    whereClause.anneeScolaireId = filters.anneeScolaireId;
  }

  const notes = await prisma.notes.findMany({
    where: whereClause,
    include: {
      etudiant: {
        select: {
          id: true,
          nom: true,
          prenom: true,
        },
      },
      matiere: {
        select: {
          id: true,
          nom: true,
        },
      },
      anneeScolaire: {
        select: {
          id: true,
          libelle: true,
          estActive: true,
        },
      },
    },
    orderBy: [
      { dateNote: 'desc' },
      { etudiant: { nom: 'asc' } },
    ],
  });

  return notes;
};

/**
 * Get note by ID
 */
export const getNoteById = async (
  noteId: string,
  userRole: string,
  userId: string
) => {
  const note = await prisma.notes.findUnique({
    where: { id: noteId },
    include: {
      etudiant: {
        select: {
          id: true,
          nom: true,
          prenom: true,
          user: {
            select: {
              email: true,
            },
          },
        },
      },
      matiere: {
        select: {
          id: true,
          nom: true,
          departement: {
            select: {
              id: true,
              nom: true,
              collegeId: true,
            },
          },
        },
      },
      anneeScolaire: {
        select: {
          id: true,
          libelle: true,
          dateDebut: true,
          dateFin: true,
          estActive: true,
        },
      },
    },
  });

  if (!note) {
    throw new NotFoundError('Note introuvable');
  }

  // Role-based access control
  if (userRole === 'ADMIN_COLLEGE') {
    const adminCollege = await prisma.admin_colleges.findUnique({
      where: { userId },
      select: { collegeId: true },
    });

    if (!adminCollege) {
      throw new ForbiddenError('Admin college record not found');
    }

    if (note.matiere.departement.collegeId !== adminCollege.collegeId) {
      throw new ForbiddenError('Cette note n\'appartient pas à votre collège');
    }
  } else if (userRole === 'ENSEIGNANT') {
    const enseignant = await prisma.enseignants.findUnique({
      where: { userId },
      include: {
        matieres: {
          where: { id: note.matiereId },
        },
      },
    });

    if (!enseignant || enseignant.matieres.length === 0) {
      throw new ForbiddenError('Vous n\'enseignez pas cette matière');
    }
  } else if (userRole === 'ETUDIANT') {
    const etudiant = await prisma.etudiants.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!etudiant || note.etudiantId !== etudiant.id) {
      throw new ForbiddenError('Vous ne pouvez voir que vos propres notes');
    }
  } else if (userRole === 'PARENT') {
    const parent = await prisma.parents.findUnique({
      where: { userId },
      include: {
        enfants: {
          where: { id: note.etudiantId },
        },
      },
    });

    if (!parent || parent.enfants.length === 0) {
      throw new ForbiddenError('Cet étudiant n\'est pas votre enfant');
    }
  }

  return note;
};

/**
 * Create a new note
 * Requires ADMIN_GLOBAL, ADMIN_COLLEGE, or ENSEIGNANT
 */
export const createNote = async (
  data: CreateNoteInput,
  userRole: string,
  userId: string
) => {
  // Only admins and teachers can create notes
  if (!['ADMIN_GLOBAL', 'ADMIN_COLLEGE', 'ENSEIGNANT'].includes(userRole)) {
    throw new ForbiddenError('Seuls les administrateurs et enseignants peuvent créer des notes');
  }

  // Verify student exists
  const etudiant = await prisma.etudiants.findUnique({
    where: { id: data.etudiantId },
  });

  if (!etudiant) {
    throw new NotFoundError('Étudiant introuvable');
  }

  // Verify subject exists
  const matiere = await prisma.matieres.findUnique({
    where: { id: data.matiereId },
    include: {
      departement: {
        select: { collegeId: true },
      },
    },
  });

  if (!matiere) {
    throw new NotFoundError('Matière introuvable');
  }

  // Verify academic year exists
  const anneeScolaire = await prisma.annees_scolaires.findUnique({
    where: { id: data.anneeScolaireId },
  });

  if (!anneeScolaire) {
    throw new NotFoundError('Année scolaire introuvable');
  }

  // Verify student is enrolled for this academic year
  const inscription = await prisma.inscriptions.findUnique({
    where: {
      etudiantId_anneeScolaireId: {
        etudiantId: data.etudiantId,
        anneeScolaireId: data.anneeScolaireId,
      },
    },
  });

  if (!inscription) {
    throw new BadRequestError(
      `L'étudiant n'est pas inscrit pour l'année scolaire ${anneeScolaire.libelle}`
    );
  }

  // ADMIN_COLLEGE: can only create notes in their college
  if (userRole === 'ADMIN_COLLEGE') {
    const adminCollege = await prisma.admin_colleges.findUnique({
      where: { userId },
      select: { collegeId: true },
    });

    if (!adminCollege) {
      throw new ForbiddenError('Admin college record not found');
    }

    if (matiere.departement.collegeId !== adminCollege.collegeId) {
      throw new ForbiddenError('Cette matière n\'appartient pas à votre collège');
    }

    if (inscription.collegeId !== adminCollege.collegeId) {
      throw new ForbiddenError('Cet étudiant n\'est pas inscrit dans votre collège');
    }
  }

  // ENSEIGNANT: can only create notes for subjects they teach
  if (userRole === 'ENSEIGNANT') {
    const enseignant = await prisma.enseignants.findUnique({
      where: { userId },
      include: {
        matieres: {
          where: { id: data.matiereId },
        },
      },
    });

    if (!enseignant) {
      throw new ForbiddenError('Enseignant record not found');
    }

    if (enseignant.matieres.length === 0) {
      throw new ForbiddenError('Vous n\'enseignez pas cette matière');
    }
  }

  // Check if note already exists (unique constraint)
  const existingNote = await prisma.notes.findUnique({
    where: {
      etudiantId_matiereId_anneeScolaireId: {
        etudiantId: data.etudiantId,
        matiereId: data.matiereId,
        anneeScolaireId: data.anneeScolaireId,
      },
    },
  });

  if (existingNote) {
    throw new ConflictError(
      'Une note existe déjà pour cet étudiant dans cette matière pour cette année scolaire'
    );
  }

  // Create note
  const note = await prisma.notes.create({
    data: {
      valeur: data.valeur,
      etudiantId: data.etudiantId,
      matiereId: data.matiereId,
      anneeScolaireId: data.anneeScolaireId,
      dateNote: data.dateNote ? new Date(data.dateNote) : new Date(),
      commentaire: data.commentaire,
    },
    include: {
      etudiant: {
        select: {
          id: true,
          nom: true,
          prenom: true,
        },
      },
      matiere: {
        select: {
          id: true,
          nom: true,
        },
      },
      anneeScolaire: {
        select: {
          id: true,
          libelle: true,
        },
      },
    },
  });

  return note;
};

/**
 * Update a note
 * Cannot change student, subject, or academic year (unique constraint)
 */
export const updateNote = async (
  noteId: string,
  data: UpdateNoteInput,
  userRole: string,
  userId: string
) => {
  // Only admins and teachers can update notes
  if (!['ADMIN_GLOBAL', 'ADMIN_COLLEGE', 'ENSEIGNANT'].includes(userRole)) {
    throw new ForbiddenError('Seuls les administrateurs et enseignants peuvent modifier des notes');
  }

  // Get note to verify existence and check access
  const existingNote = await getNoteById(noteId, userRole, userId);

  // Prepare update data
  const updateData: any = {};
  if (data.valeur !== undefined) updateData.valeur = data.valeur;
  if (data.dateNote) updateData.dateNote = new Date(data.dateNote);
  if (data.commentaire !== undefined) updateData.commentaire = data.commentaire;

  // Update note
  const updatedNote = await prisma.notes.update({
    where: { id: noteId },
    data: updateData,
    include: {
      etudiant: {
        select: {
          id: true,
          nom: true,
          prenom: true,
        },
      },
      matiere: {
        select: {
          id: true,
          nom: true,
        },
      },
      anneeScolaire: {
        select: {
          id: true,
          libelle: true,
        },
      },
    },
  });

  return updatedNote;
};

/**
 * Delete a note
 */
export const deleteNote = async (
  noteId: string,
  userRole: string,
  userId: string
) => {
  // Only admins and teachers can delete notes
  if (!['ADMIN_GLOBAL', 'ADMIN_COLLEGE', 'ENSEIGNANT'].includes(userRole)) {
    throw new ForbiddenError('Seuls les administrateurs et enseignants peuvent supprimer des notes');
  }

  // Get note to verify existence and check access
  await getNoteById(noteId, userRole, userId);

  // Delete note
  await prisma.notes.delete({
    where: { id: noteId },
  });

  return { message: 'Note supprimée avec succès' };
};

/**
 * Get student statistics for an academic year
 * Calculates average per subject and overall average (weighted by coefficient)
 */
export const getStudentStatistics = async (
  etudiantId: string,
  anneeScolaireId: string,
  userRole: string,
  userId: string
) => {
  // Verify student exists
  const etudiant = await prisma.etudiants.findUnique({
    where: { id: etudiantId },
    select: {
      id: true,
      nom: true,
      prenom: true,
    },
  });

  if (!etudiant) {
    throw new NotFoundError('Étudiant introuvable');
  }

  // Verify academic year exists
  const anneeScolaire = await prisma.annees_scolaires.findUnique({
    where: { id: anneeScolaireId },
  });

  if (!anneeScolaire) {
    throw new NotFoundError('Année scolaire introuvable');
  }

  // Verify enrollment
  const inscription = await prisma.inscriptions.findUnique({
    where: {
      etudiantId_anneeScolaireId: {
        etudiantId,
        anneeScolaireId,
      },
    },
    include: {
      college: {
        select: {
          id: true,
          nom: true,
        },
      },
    },
  });

  if (!inscription) {
    throw new BadRequestError(
      `L'étudiant n'est pas inscrit pour l'année scolaire ${anneeScolaire.libelle}`
    );
  }

  // Role-based access control
  if (userRole === 'ADMIN_COLLEGE') {
    const adminCollege = await prisma.admin_colleges.findUnique({
      where: { userId },
      select: { collegeId: true },
    });

    if (!adminCollege || inscription.collegeId !== adminCollege.collegeId) {
      throw new ForbiddenError('Cet étudiant n\'est pas dans votre collège');
    }
  } else if (userRole === 'ETUDIANT') {
    const currentEtudiant = await prisma.etudiants.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!currentEtudiant || currentEtudiant.id !== etudiantId) {
      throw new ForbiddenError('Vous ne pouvez voir que vos propres statistiques');
    }
  } else if (userRole === 'PARENT') {
    const parent = await prisma.parents.findUnique({
      where: { userId },
      include: {
        enfants: {
          where: { id: etudiantId },
        },
      },
    });

    if (!parent || parent.enfants.length === 0) {
      throw new ForbiddenError('Cet étudiant n\'est pas votre enfant');
    }
  } else if (userRole === 'ENSEIGNANT') {
    // Teachers can only see stats for students in their subjects
    const enseignant = await prisma.enseignants.findUnique({
      where: { userId },
      include: {
        matieres: true,
      },
    });

    if (!enseignant) {
      throw new ForbiddenError('Enseignant record not found');
    }

    // Check if student has at least one note in teacher's subjects
    const matiereIds = enseignant.matieres.map((m) => m.id);
    const hasNote = await prisma.notes.findFirst({
      where: {
        etudiantId,
        anneeScolaireId,
        matiereId: { in: matiereIds },
      },
    });

    if (!hasNote) {
      throw new ForbiddenError('Vous n\'enseignez aucune matière à cet étudiant');
    }
  }

  // Get all notes for this student and academic year
  const notes = await prisma.notes.findMany({
    where: {
      etudiantId,
      anneeScolaireId,
    },
    include: {
      matiere: {
        select: {
          id: true,
          nom: true,
        },
      },
    },
    orderBy: {
      matiere: { nom: 'asc' },
    },
  });

  // Calculate statistics
  const notesByMatiere = notes.map((note) => ({
    matiere: note.matiere,
    note: note.valeur,
    dateNote: note.dateNote,
    commentaire: note.commentaire,
  }));

  // Calculate simple average (no coefficient in schema)
  let totalPoints = 0;

  notes.forEach((note) => {
    totalPoints += note.valeur;
  });

  const moyenneGenerale = notes.length > 0 ? totalPoints / notes.length : null;

  return {
    etudiant,
    anneeScolaire: {
      id: anneeScolaire.id,
      libelle: anneeScolaire.libelle,
    },
    college: inscription.college,
    notes: notesByMatiere,
    statistiques: {
      nombreMatieres: notes.length,
      moyenneGenerale: moyenneGenerale ? parseFloat(moyenneGenerale.toFixed(2)) : null,
    },
  };
};
