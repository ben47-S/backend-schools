/**
 * Script de configuration des données initiales
 * Crée une année scolaire active et associe un admin à un collège
 */

import { prisma } from '../src/lib/prisma.js';

async function main() {
  console.log('🔍 Vérification des données...\n');

  // 1. Vérifier les collèges
  const colleges = await prisma.colleges.findMany({
    select: {
      id: true,
      nom: true,
    },
  });

  console.log(`📚 Collèges trouvés: ${colleges.length}`);
  if (colleges.length > 0) {
    colleges.forEach((c) => console.log(`  - ${c.nom} (${c.id})`));
  }
  console.log('');

  // 2. Vérifier les années scolaires
  const annees = await prisma.annees_scolaires.findMany({
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

  console.log(`📅 Années scolaires trouvées: ${annees.length}`);
  if (annees.length > 0) {
    annees.forEach((a) =>
      console.log(
        `  - ${a.libelle} (Active: ${a.estActive}, Inscriptions: ${a.estInscriptionOuverte})`
      )
    );
  }
  console.log('');

  // 3. Vérifier les admins de collège
  const adminsCollege = await prisma.admin_colleges.findMany({
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

  console.log(`👤 Admins de collège trouvés: ${adminsCollege.length}`);
  if (adminsCollege.length > 0) {
    adminsCollege.forEach((a) =>
      console.log(`  - ${a.user.email} → ${a.college.nom}`)
    );
  }
  console.log('');

  // 4. Trouver les utilisateurs ADMIN_COLLEGE sans association
  const usersAdminCollege = await prisma.users.findMany({
    where: {
      role: 'ADMIN_COLLEGE',
    },
    select: {
      id: true,
      email: true,
    },
  });

  console.log(`👔 Utilisateurs ADMIN_COLLEGE trouvés: ${usersAdminCollege.length}`);

  const adminsWithoutCollege = [];
  for (const user of usersAdminCollege) {
    const hasCollege = await prisma.admin_colleges.findUnique({
      where: { userId: user.id },
    });

    if (!hasCollege) {
      adminsWithoutCollege.push(user);
      console.log(`  ⚠️  ${user.email} - PAS DE COLLÈGE ASSOCIÉ`);
    } else {
      console.log(`  ✅ ${user.email} - Collège associé`);
    }
  }
  console.log('');

  // 5. Proposer des corrections
  console.log('🔧 Actions recommandées:\n');

  if (colleges.length === 0) {
    console.log('❌ Aucun collège trouvé - Créez un collège en tant qu\'ADMIN_GLOBAL');
  }

  if (annees.length === 0 && colleges.length > 0) {
    console.log('⚠️  Aucune année scolaire trouvée - Création automatique...\n');

    // Créer une année scolaire active
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

    console.log(`✅ Année scolaire créée: ${nouvelleAnnee.libelle}`);
    console.log(`   Inscriptions ouvertes du ${nouvelleAnnee.dateOuvertureInscriptions.toLocaleDateString('fr-FR')} au ${nouvelleAnnee.dateFermetureInscriptions.toLocaleDateString('fr-FR')}`);
  } else if (annees.length > 0) {
    const activeYear = annees.find((a) => a.estActive);
    if (!activeYear) {
      console.log('⚠️  Aucune année scolaire active - Activez une année existante');
    } else {
      console.log(`✅ Année scolaire active: ${activeYear.libelle}`);
    }
  }

  if (adminsWithoutCollege.length > 0 && colleges.length > 0) {
    console.log(
      `\n⚠️  ${adminsWithoutCollege.length} admin(s) sans collège associé - Association automatique...\n`
    );

    for (const admin of adminsWithoutCollege) {
      // Associer au premier collège disponible
      const college = colleges[0];

      await prisma.admin_colleges.create({
        data: {
          userId: admin.id,
          collegeId: college.id,
        },
      });

      console.log(`✅ ${admin.email} → ${college.nom}`);
    }
  }

  console.log('\n✅ Configuration terminée!\n');
}

main()
  .catch((error) => {
    console.error('❌ Erreur:', error);
    process.exit(1);
  })
  .then(() => {
    process.exit(0);
  });
