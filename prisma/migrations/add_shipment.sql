-- CreateEnum
CREATE TYPE "ShipmentStatus" AS ENUM ('PENDING_BOOKING', 'BOOKED', 'PICKING', 'IN_TRANSIT', 'DELIVERED', 'FAILED', 'RETURNING', 'RETURNED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ShipmentDirection" AS ENUM ('DELIVERY', 'RETURN');

-- AlterEnum
ALTER TYPE "RentalStatus" ADD VALUE IF NOT EXISTS 'OWNER_PACKED';

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "platformFee" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "shippingFeeCollected" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "shipments" (
    "id" TEXT NOT NULL,
    "rentalId" TEXT NOT NULL,
    "direction" "ShipmentDirection" NOT NULL DEFAULT 'DELIVERY',
    "provider" TEXT,
    "status" "ShipmentStatus" NOT NULL DEFAULT 'PENDING_BOOKING',
    "trackingCode" TEXT,
    "clientOrderCode" TEXT,
    "providerOrderCode" TEXT,
    "shippingFeeCollected" INTEGER NOT NULL DEFAULT 0,
    "actualShippingFee" INTEGER,
    "pickupAddress" JSONB,
    "deliveryAddress" JSONB,
    "providerRawPayload" JSONB,
    "bookedByAdminId" TEXT,
    "bookedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shipments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "shipments_rentalId_idx" ON "shipments"("rentalId");

-- CreateIndex
CREATE INDEX "shipments_status_idx" ON "shipments"("status");

-- CreateIndex
CREATE INDEX "shipments_trackingCode_idx" ON "shipments"("trackingCode");

-- CreateIndex (Unique)
CREATE UNIQUE INDEX "shipments_clientOrderCode_key" ON "shipments"("clientOrderCode");

-- CreateIndex (Unique Combo)
CREATE UNIQUE INDEX "shipments_provider_providerOrderCode_key" ON "shipments"("provider", "providerOrderCode");

-- CreateIndex (Unique Combo)
CREATE UNIQUE INDEX "shipments_rentalId_direction_key" ON "shipments"("rentalId", "direction");

-- AddForeignKey
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_rentalId_fkey" FOREIGN KEY ("rentalId") REFERENCES "rental_history"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Constraints
ALTER TABLE "Invoice"
ADD CONSTRAINT "Invoice_shippingFeeCollected_nonnegative"
CHECK ("shippingFeeCollected" >= 0),
ADD CONSTRAINT "Invoice_platformFee_nonnegative"
CHECK ("platformFee" >= 0);

ALTER TABLE "shipments"
ADD CONSTRAINT "shipments_shippingFeeCollected_nonnegative"
CHECK ("shippingFeeCollected" >= 0),
ADD CONSTRAINT "shipments_actualShippingFee_nonnegative"
CHECK ("actualShippingFee" IS NULL OR "actualShippingFee" >= 0);
