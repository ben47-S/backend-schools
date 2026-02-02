/*
  Warnings:

  - Added the required column `dateFermetureInscriptions` to the `annees_scolaires` table without a default value. This is not possible if the table is not empty.
  - Added the required column `dateOuvertureInscriptions` to the `annees_scolaires` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `annees_scolaires` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `etudiants` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "StatutEtudiant" AS ENUM ('ACTIF', 'INACTIF', 'DIPLOME');

-- CreateEnum
CREATE TYPE "StatutInscription" AS ENUM ('EN_ATTENTE', 'ACCEPTE', 'REFUSE');

-- AlterTable
-- First add columns as nullable
ALTER TABLE "annees_scolaires" ADD COLUMN     "dateFermetureInscriptions" TIMESTAMP(3),
ADD COLUMN     "dateOuvertureInscriptions" TIMESTAMP(3),
ADD COLUMN     "estInscriptionOuverte" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "updatedAt" TIMESTAMP(3);

-- Set default values for existing rows
UPDATE "annees_scolaires" SET
  "dateOuvertureInscriptions" = "dateDebut",
  "dateFermetureInscriptions" = "dateFin",
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "dateOuvertureInscriptions" IS NULL;

-- Make columns NOT NULL
ALTER TABLE "annees_scolaires" ALTER COLUMN "dateFermetureInscriptions" SET NOT NULL;
ALTER TABLE "annees_scolaires" ALTER COLUMN "dateOuvertureInscriptions" SET NOT NULL;
ALTER TABLE "annees_scolaires" ALTER COLUMN "updatedAt" SET NOT NULL;

-- AlterTable
-- First add updatedAt as nullable
ALTER TABLE "etudiants" ADD COLUMN     "collegeId" TEXT,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "statut" "StatutEtudiant" NOT NULL DEFAULT 'INACTIF',
ADD COLUMN     "updatedAt" TIMESTAMP(3);

-- Set default value for existing rows
UPDATE "etudiants" SET "updatedAt" = CURRENT_TIMESTAMP WHERE "updatedAt" IS NULL;

-- Make column NOT NULL
ALTER TABLE "etudiants" ALTER COLUMN "updatedAt" SET NOT NULL;

-- AlterTable
ALTER TABLE "inscriptions" ADD COLUMN     "dateReponse" TIMESTAMP(3),
ADD COLUMN     "statut" "StatutInscription" NOT NULL DEFAULT 'EN_ATTENTE';

-- CreateIndex
CREATE INDEX "etudiants_collegeId_idx" ON "etudiants"("collegeId");

-- CreateIndex
CREATE INDEX "etudiants_statut_idx" ON "etudiants"("statut");

-- CreateIndex
CREATE INDEX "inscriptions_statut_idx" ON "inscriptions"("statut");

-- CreateIndex
CREATE INDEX "inscriptions_collegeId_statut_idx" ON "inscriptions"("collegeId", "statut");

-- AddForeignKey
ALTER TABLE "etudiants" ADD CONSTRAINT "etudiants_collegeId_fkey" FOREIGN KEY ("collegeId") REFERENCES "colleges"("id") ON DELETE SET NULL ON UPDATE CASCADE;
