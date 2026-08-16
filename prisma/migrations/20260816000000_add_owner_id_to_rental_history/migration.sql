-- AlterTable
ALTER TABLE "rental_history" ADD COLUMN     "ownerId" TEXT;

-- CreateIndex
CREATE INDEX "rental_history_ownerId_idx" ON "rental_history"("ownerId");

-- Backfill ownerId from products table
UPDATE "rental_history" rh
SET "ownerId" = p."userId"
FROM "products" p
WHERE rh."product_id" = p."id" AND rh."ownerId" IS NULL;
