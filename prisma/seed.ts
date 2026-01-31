// prisma/seed.ts
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({
  adapter,
});

async function main() {
  // Exemple inspiré des seeds officiels : création de quelques enregistrements
  // À adapter avec tes propres données cohérentes (College, User, Enseignant, etc.)

  // 1. Créer un collège
  const college = await prisma.college.create({
    data: {
      nom: "Collège Demo",
      siteWeb: "https://college-demo.example",
      adresse: "1 rue de la Demo",
    },
  });

  // 2. Créer une année scolaire
  const annee = await prisma.anneeScolaire.create({
    data: {
      libelle: "2024-2025",
      dateDebut: new Date("2024-09-01"),
      dateFin: new Date("2025-06-30"),
      estActive: true,
    },
  });

  // 3. Créer un département
  const departement = await prisma.departement.create({
    data: {
      nom: "Informatique",
      collegeId: college.id,
    },
  });

  // 4. Créer une matière
  const matiere = await prisma.matiere.create({
    data: {
      nom: "Programmation",
      departementId: departement.id,
    },
  });

  // 5. Créer un user ADMIN_GLOBAL
  const adminUser = await prisma.user.create({
    data: {
      email: "admin@demo.com",
      passwordHash: "hash-a-remplacer",
      role: "ADMIN_GLOBAL",
    },
  });

  // 6. Créer un user enseignant + Enseignant lié
  const enseignantUser = await prisma.user.create({
    data: {
      email: "enseignant@demo.com",
      passwordHash: "hash-a-remplacer",
      role: "ENSEIGNANT",
      enseignant: {
        create: {
          nom: "Dupont",
          prenom: "Jean",
          datePriseFonction: new Date("2024-09-01"),
          indice: 1,
          matiere: {
            connect: { id: matiere.id },
          },
        },
      },
    },
    include: { enseignant: true },
  });

  // 7. Lier l’enseignant au département et à l’année scolaire
  await prisma.enseignantDepartement.create({
    data: {
      enseignantId: enseignantUser.enseignant!.id,
      departementId: departement.id,
      anneeScolaireId: annee.id,
      estResponsable: true,
    },
  });

  // 8. Créer un user étudiant + Etudiant + Inscription
  const etudiantUser = await prisma.user.create({
    data: {
      email: "etudiant@demo.com",
      passwordHash: "hash-a-remplacer",
      role: "ETUDIANT",
      etudiant: {
        create: {
          nom: "Martin",
          prenom: "Alice",
          anneeEntree: 2024,
        },
      },
    },
    include: { etudiant: true },
  });

  await prisma.inscription.create({
    data: {
      etudiantId: etudiantUser.etudiant!.id,
      collegeId: college.id,
      anneeScolaireId: annee.id,
    },
  });

  console.log("Seed terminé.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });