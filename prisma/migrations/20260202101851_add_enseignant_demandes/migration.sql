-- CreateEnum
CREATE TYPE "StatutDemande" AS ENUM ('EN_ATTENTE', 'ACCEPTE', 'REFUSE');

-- CreateTable
CREATE TABLE "enseignant_demandes" (
    "id" TEXT NOT NULL,
    "enseignantId" TEXT NOT NULL,
    "departementId" TEXT NOT NULL,
    "anneeScolaireId" TEXT NOT NULL,
    "statut" "StatutDemande" NOT NULL DEFAULT 'EN_ATTENTE',
    "dateCreation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateReponse" TIMESTAMP(3),

    CONSTRAINT "enseignant_demandes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "enseignant_demandes_statut_idx" ON "enseignant_demandes"("statut");

-- CreateIndex
CREATE INDEX "enseignant_demandes_enseignantId_statut_idx" ON "enseignant_demandes"("enseignantId", "statut");

-- CreateIndex
CREATE UNIQUE INDEX "enseignant_demandes_enseignantId_departementId_anneeScolair_key" ON "enseignant_demandes"("enseignantId", "departementId", "anneeScolaireId");

-- AddForeignKey
ALTER TABLE "enseignant_demandes" ADD CONSTRAINT "enseignant_demandes_enseignantId_fkey" FOREIGN KEY ("enseignantId") REFERENCES "enseignants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enseignant_demandes" ADD CONSTRAINT "enseignant_demandes_departementId_fkey" FOREIGN KEY ("departementId") REFERENCES "departements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enseignant_demandes" ADD CONSTRAINT "enseignant_demandes_anneeScolaireId_fkey" FOREIGN KEY ("anneeScolaireId") REFERENCES "annees_scolaires"("id") ON DELETE CASCADE ON UPDATE CASCADE;
