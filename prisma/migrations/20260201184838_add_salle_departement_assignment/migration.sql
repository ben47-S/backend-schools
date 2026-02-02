-- AlterTable
ALTER TABLE "inscriptions" ADD COLUMN     "salleId" TEXT;

-- AlterTable
ALTER TABLE "salles" ADD COLUMN     "departementId" TEXT;

-- CreateIndex
CREATE INDEX "inscriptions_salleId_idx" ON "inscriptions"("salleId");

-- CreateIndex
CREATE INDEX "salles_departementId_idx" ON "salles"("departementId");

-- AddForeignKey
ALTER TABLE "inscriptions" ADD CONSTRAINT "inscriptions_salleId_fkey" FOREIGN KEY ("salleId") REFERENCES "salles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salles" ADD CONSTRAINT "salles_departementId_fkey" FOREIGN KEY ("departementId") REFERENCES "departements"("id") ON DELETE SET NULL ON UPDATE CASCADE;
