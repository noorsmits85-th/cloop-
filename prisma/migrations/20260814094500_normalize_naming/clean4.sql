-- DropForeignKey
ALTER TABLE "BlogInteraction" DROP CONSTRAINT "BlogInteraction_blogId_fkey";

-- DropForeignKey
ALTER TABLE "BlogInteraction" DROP CONSTRAINT "BlogInteraction_userId_fkey";

-- DropForeignKey
ALTER TABLE "BlogPost" DROP CONSTRAINT "BlogPost_productId_fkey";

-- DropForeignKey
ALTER TABLE "BlogPost" DROP CONSTRAINT "BlogPost_userId_fkey";

-- DropForeignKey
ALTER TABLE "Dispute" DROP CONSTRAINT "Dispute_invoiceId_fkey";

-- DropForeignKey
ALTER TABLE "Dispute" DROP CONSTRAINT "Dispute_rentalId_fkey";

-- DropForeignKey
ALTER TABLE "Invoice" DROP CONSTRAINT "Invoice_rentalId_fkey";

-- DropForeignKey
ALTER TABLE "LedgerTransaction" DROP CONSTRAINT "LedgerTransaction_invoiceId_fkey";

-- DropForeignKey
ALTER TABLE "Listing" DROP CONSTRAINT "Listing_productId_fkey";

-- DropForeignKey
ALTER TABLE "ProductImage" DROP CONSTRAINT "ProductImage_productId_fkey";

-- DropForeignKey
ALTER TABLE "ProductLifecycle" DROP CONSTRAINT "ProductLifecycle_productId_fkey";

-- DropForeignKey
ALTER TABLE "ProductLifecycle" DROP CONSTRAINT "ProductLifecycle_userId_fkey";

-- DropForeignKey
ALTER TABLE "Review" DROP CONSTRAINT "Review_productId_fkey";

-- DropForeignKey
ALTER TABLE "Review" DROP CONSTRAINT "Review_revieweeId_fkey";

-- DropForeignKey
ALTER TABLE "Review" DROP CONSTRAINT "Review_reviewerId_fkey";

-- DropForeignKey
ALTER TABLE "products" DROP CONSTRAINT "products_userId_fkey";

-- DropForeignKey
ALTER TABLE "rental_history" DROP CONSTRAINT "rental_history_renterId_fkey";

-- DropTable
DROP TABLE "AccountingPeriod";

-- DropTable
DROP TABLE "AuditLog";

-- DropTable
DROP TABLE "BlogInteraction";

-- DropTable
DROP TABLE "BlogPost";

-- DropTable
DROP TABLE "Dispute";

-- DropTable
DROP TABLE "Invoice";

-- DropTable
DROP TABLE "LedgerTransaction";

-- DropTable
DROP TABLE "Listing";

-- DropTable
DROP TABLE "ProductImage";

-- DropTable
DROP TABLE "ProductLifecycle";

-- DropTable
DROP TABLE "Review";

-- DropTable
DROP TABLE "User";

-- CreateTable
CREATE TABLE "profiles" (
    "id" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "name" TEXT,
    "avatar" TEXT,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 5.0,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "totalListings" INTEGER NOT NULL DEFAULT 0,
    "completedOrders" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cloopCoins" INTEGER NOT NULL DEFAULT 1500,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_images" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "storageProvider" TEXT NOT NULL DEFAULT 'cloudinary',
    "publicId" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "bytes" INTEGER,
    "format" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "listings" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "listingType" "ListingType" NOT NULL,
    "status" "ListingStatus" NOT NULL DEFAULT 'AVAILABLE',
    "basePrice" INTEGER,
    "snapshot" JSONB,
    "pricing_tiers" JSONB,
    "turnaround_days" INTEGER NOT NULL DEFAULT 2,
    "salePrice" INTEGER,
    "deposit" INTEGER,
    "minDays" INTEGER,
    "greenPoints" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "listings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "rentalId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "orderCode" BIGINT,
    "paymentLinkId" TEXT,
    "payosStatus" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ledger_transactions" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT,
    "type" "LedgerType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "description" TEXT,
    "adminId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ledger_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "disputes" (
    "id" TEXT NOT NULL,
    "rentalId" TEXT NOT NULL,
    "invoiceId" TEXT,
    "description" TEXT NOT NULL,
    "images" TEXT[],
    "severity" "DamageSeverity" NOT NULL,
    "suggestedDeduction" INTEGER NOT NULL,
    "finalDeduction" INTEGER,
    "status" "DisputeStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "adminNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "disputes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "beforeStatus" TEXT,
    "afterStatus" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounting_periods" (
    "id" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "nextPeriodStart" TIMESTAMP(3) NOT NULL,
    "status" "AccountingPeriodStatus" NOT NULL DEFAULT 'CLOSED',
    "revenueTotal" INTEGER NOT NULL,
    "expenseTotal" INTEGER NOT NULL DEFAULT 0,
    "netProfit" INTEGER NOT NULL,
    "closedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedByAdminId" TEXT NOT NULL,
    "metadata" TEXT,

    CONSTRAINT "accounting_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "revieweeId" TEXT NOT NULL,
    "productId" TEXT,
    "rating" DOUBLE PRECISION NOT NULL,
    "comment" TEXT,
    "type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blog_posts" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "cover_image" TEXT,
    "productId" TEXT,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PUBLIC',
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "blog_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blog_interactions" (
    "id" TEXT NOT NULL,
    "blogId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "content" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blog_interactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_lifecycles" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "eventType" "LifecycleEventType" NOT NULL,
    "userId" TEXT NOT NULL,
    "co2Saved" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_lifecycles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "product_images_productId_idx" ON "product_images"("productId");

-- CreateIndex
CREATE INDEX "product_images_productId_isPrimary_idx" ON "product_images"("productId", "isPrimary");

-- CreateIndex
CREATE INDEX "listings_productId_idx" ON "listings"("productId");

-- CreateIndex
CREATE INDEX "listings_status_idx" ON "listings"("status");

-- CreateIndex
CREATE INDEX "listings_listingType_idx" ON "listings"("listingType");

-- CreateIndex
CREATE INDEX "listings_basePrice_idx" ON "listings"("basePrice");

-- CreateIndex
CREATE INDEX "listings_salePrice_idx" ON "listings"("salePrice");

-- CreateIndex
CREATE INDEX "listings_createdAt_idx" ON "listings"("createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "listings_updatedAt_id_key" ON "listings"("updatedAt", "id");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_rentalId_key" ON "invoices"("rentalId");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_orderCode_key" ON "invoices"("orderCode");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_paymentLinkId_key" ON "invoices"("paymentLinkId");

-- CreateIndex
CREATE INDEX "invoices_rentalId_idx" ON "invoices"("rentalId");

-- CreateIndex
CREATE INDEX "invoices_status_idx" ON "invoices"("status");

-- CreateIndex
CREATE INDEX "ledger_transactions_invoiceId_idx" ON "ledger_transactions"("invoiceId");

-- CreateIndex
CREATE INDEX "ledger_transactions_adminId_idx" ON "ledger_transactions"("adminId");

-- CreateIndex
CREATE INDEX "ledger_transactions_type_idx" ON "ledger_transactions"("type");

-- CreateIndex
CREATE INDEX "ledger_transactions_createdAt_idx" ON "ledger_transactions"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "disputes_rentalId_idx" ON "disputes"("rentalId");

-- CreateIndex
CREATE INDEX "disputes_invoiceId_idx" ON "disputes"("invoiceId");

-- CreateIndex
CREATE INDEX "disputes_status_idx" ON "disputes"("status");

-- CreateIndex
CREATE INDEX "audit_logs_adminId_idx" ON "audit_logs"("adminId");

-- CreateIndex
CREATE INDEX "audit_logs_targetId_idx" ON "audit_logs"("targetId");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "accounting_periods_month_year_key" ON "accounting_periods"("month", "year");

-- CreateIndex
CREATE INDEX "reviews_reviewerId_idx" ON "reviews"("reviewerId");

-- CreateIndex
CREATE INDEX "reviews_revieweeId_idx" ON "reviews"("revieweeId");

-- CreateIndex
CREATE INDEX "reviews_productId_idx" ON "reviews"("productId");

-- CreateIndex
CREATE INDEX "blog_posts_userId_idx" ON "blog_posts"("userId");

-- CreateIndex
CREATE INDEX "blog_posts_productId_idx" ON "blog_posts"("productId");

-- CreateIndex
CREATE INDEX "blog_posts_status_idx" ON "blog_posts"("status");

-- CreateIndex
CREATE INDEX "blog_posts_createdAt_idx" ON "blog_posts"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "blog_interactions_blogId_idx" ON "blog_interactions"("blogId");

-- CreateIndex
CREATE INDEX "blog_interactions_userId_idx" ON "blog_interactions"("userId");

-- CreateIndex
CREATE INDEX "product_lifecycles_productId_idx" ON "product_lifecycles"("productId");

-- CreateIndex
CREATE INDEX "product_lifecycles_userId_idx" ON "product_lifecycles"("userId");

-- CreateIndex
CREATE INDEX "product_lifecycles_eventType_idx" ON "product_lifecycles"("eventType");

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_userId_fkey" FOREIGN KEY ("userId") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listings" ADD CONSTRAINT "listings_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_history" ADD CONSTRAINT "rental_history_renterId_fkey" FOREIGN KEY ("renterId") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_rentalId_fkey" FOREIGN KEY ("rentalId") REFERENCES "rental_history"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_transactions" ADD CONSTRAINT "ledger_transactions_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_rentalId_fkey" FOREIGN KEY ("rentalId") REFERENCES "rental_history"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_revieweeId_fkey" FOREIGN KEY ("revieweeId") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_interactions" ADD CONSTRAINT "blog_interactions_blogId_fkey" FOREIGN KEY ("blogId") REFERENCES "blog_posts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_interactions" ADD CONSTRAINT "blog_interactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_lifecycles" ADD CONSTRAINT "product_lifecycles_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_lifecycles" ADD CONSTRAINT "product_lifecycles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

