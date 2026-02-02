/**
 * Setup Routes - Routes temporaires pour configuration initiale
 * À SUPPRIMER en production
 */

import { Router } from 'express';
import { prisma } from '../lib/prisma.js';

const router = Router();

/**
 * Diagnostic et correction des données
 */
router.get('/diagnostic', async (req, res) => {
  try {
    const results: any = {
      colleges: [],
      annees: [],
      adminsCollege: [],
      usersAdminCollege: [],
      adminsWithoutCollege: [],
      corrections: [],
    };

    // 1. Vérifier les collèges
    results.colleges = await prisma.colleges.findMany({
      select: {
        id: true,
        nom: true,
      },
    });

    // 2. Vérifier les années scolaires
    results.annees = await prisma.annees_scolaires.findMany({
      select: {
        id: true,
        libelle: true,
        estActive: true,
        dateDebut: true,
        dateFin: true,
        dateOuvertureInscriptions: true,
        dateFermetureInscriptions: true,
        estInscriptionOuverte: true,
      },
    });

    // 3. Vérifier les admins de collège
    results.adminsCollege = await prisma.admin_colleges.findMany({
      include: {
        user: {
          select: {
            email: true,
            role: true,
          },
        },
        college: {
          select: {
            nom: true,
          },
        },
      },
    });

    // 4. Trouver les utilisateurs ADMIN_COLLEGE sans association
    results.usersAdminCollege = await prisma.users.findMany({
      where: {
        role: 'ADMIN_COLLEGE',
      },
      select: {
        id: true,
        email: true,
      },
    });

    for (const user of results.usersAdminCollege) {
      const hasCollege = await prisma.admin_colleges.findUnique({
        where: { userId: user.id },
      });

      if (!hasCollege) {
        results.adminsWithoutCollege.push(user);
      }
    }

    // 5. Proposer des corrections
    if (results.annees.length === 0 && results.colleges.length > 0) {
      results.corrections.push({
        type: 'CREATE_YEAR',
        message: 'Aucune année scolaire trouvée - Création recommandée',
      });
    }

    if (results.adminsWithoutCollege.length > 0 && results.colleges.length > 0) {
      results.corrections.push({
        type: 'LINK_ADMINS',
        message: `${results.adminsWithoutCollege.length} admin(s) sans collège - Association recommandée`,
      });
    }

    res.json({
      success: true,
      data: results,
    });
  } catch (error: any) {
    console.error('Error in diagnostic:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Créer une année scolaire active
 */
router.post('/create-year', async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();
    const nextYear = currentYear + 1;

    const nouvelleAnnee = await prisma.annees_scolaires.create({
      data: {
        libelle: `${currentYear}-${nextYear}`,
        dateDebut: new Date(`${currentYear}-09-01`),
        dateFin: new Date(`${nextYear}-06-30`),
        dateOuvertureInscriptions: new Date(`${currentYear}-06-01`),
        dateFermetureInscriptions: new Date(`${currentYear}-09-30`),
        estActive: true,
        estInscriptionOuverte: true,
      },
    });

    res.json({
      success: true,
      data: nouvelleAnnee,
      message: `Année scolaire ${nouvelleAnnee.libelle} créée avec succès`,
    });
  } catch (error: any) {
    console.error('Error creating year:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Associer les admins sans collège au premier collège disponible
 */
router.post('/link-admins', async (req, res) => {
  try {
    // Trouver les admins sans collège
    const usersAdminCollege = await prisma.users.findMany({
      where: {
        role: 'ADMIN_COLLEGE',
      },
      select: {
        id: true,
        email: true,
      },
    });

    const adminsWithoutCollege = [];
    for (const user of usersAdminCollege) {
      const hasCollege = await prisma.admin_colleges.findUnique({
        where: { userId: user.id },
      });

      if (!hasCollege) {
        adminsWithoutCollege.push(user);
      }
    }

    if (adminsWithoutCollege.length === 0) {
      return res.json({
        success: true,
        message: 'Tous les admins ont déjà un collège associé',
        data: [],
      });
    }

    // Trouver le premier collège disponible
    const college = await prisma.colleges.findFirst();

    if (!college) {
      return res.status(400).json({
        success: false,
        error: 'Aucun collège disponible',
      });
    }

    // Associer tous les admins au collège
    const created = [];
    for (const admin of adminsWithoutCollege) {
      const association = await prisma.admin_colleges.create({
        data: {
          userId: admin.id,
          collegeId: college.id,
        },
      });

      created.push({
        email: admin.email,
        college: college.nom,
      });
    }

    res.json({
      success: true,
      data: created,
      message: `${created.length} admin(s) associé(s) au collège ${college.nom}`,
    });
  } catch (error: any) {
    console.error('Error linking admins:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
