-- AlterTable
ALTER TABLE "rental_history" ADD COLUMN     "ownerId" TEXT;

-- CreateIndex
CREATE INDEX "rental_history_ownerId_idx" ON "rental_history"("ownerId");
