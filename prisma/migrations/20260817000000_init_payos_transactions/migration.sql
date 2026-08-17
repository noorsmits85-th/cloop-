-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('VERIFIED', 'PROCESSED', 'AMOUNT_MISMATCH', 'DUPLICATE', 'FAILED');

-- CreateTable
CREATE TABLE "TransactionHistory" (
    "id" TEXT NOT NULL,
    "eventId" TEXT,
    "orderCode" BIGINT NOT NULL,
    "invoiceId" TEXT,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'VND',
    "invoiceAmount" INTEGER NOT NULL,
    "status" "TransactionStatus" NOT NULL,
    "rawPayload" JSONB NOT NULL,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TransactionHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TransactionHistory_eventId_key" ON "TransactionHistory"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "TransactionHistory_orderCode_key" ON "TransactionHistory"("orderCode");

-- CreateIndex
CREATE INDEX "TransactionHistory_orderCode_idx" ON "TransactionHistory"("orderCode");

-- CreateIndex
CREATE INDEX "TransactionHistory_eventId_idx" ON "TransactionHistory"("eventId");

-- AddForeignKey
ALTER TABLE "TransactionHistory" ADD CONSTRAINT "TransactionHistory_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
