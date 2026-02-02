-- AlterTable
ALTER TABLE "departements" ADD COLUMN     "adminEnseignantId" TEXT;

-- AddForeignKey
ALTER TABLE "departements" ADD CONSTRAINT "departements_adminEnseignantId_fkey" FOREIGN KEY ("adminEnseignantId") REFERENCES "enseignants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
