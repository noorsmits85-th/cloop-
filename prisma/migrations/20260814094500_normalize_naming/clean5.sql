





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

-- UPDATE TRIGGER FOR PROFILES
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public."profiles" (id, name, role)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    'USER'::"UserRole"
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE ALL ON "invoices" FROM anon, authenticated;

REVOKE ALL ON "ledger_transactions" FROM anon, authenticated;

REVOKE ALL ON "disputes" FROM anon, authenticated;

REVOKE ALL ON "rental_history" FROM anon, authenticated;

ALTER TABLE "products" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "product_images" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "listings" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "blog_posts" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "reviews" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public select products" ON "products" FOR SELECT USING (true);

CREATE POLICY "Public select product_images" ON "product_images" FOR SELECT USING (true);

CREATE POLICY "Public select listings" ON "listings" FOR SELECT USING (true);

CREATE POLICY "Public select profiles" ON "profiles" FOR SELECT USING (true);

CREATE POLICY "Public select blog_posts" ON "blog_posts" FOR SELECT USING (true);

CREATE POLICY "Public select reviews" ON "reviews" FOR SELECT USING (true);

CREATE POLICY "Owner update products" ON "products" FOR UPDATE USING (auth.uid() = "userId"::uuid);

CREATE POLICY "Owner delete products" ON "products" FOR DELETE USING (auth.uid() = "userId"::uuid);

CREATE POLICY "Owner update listings" ON "listings" FOR UPDATE USING (auth.uid() IN (SELECT "userId"::uuid FROM products WHERE id = "productId"));

CREATE POLICY "Owner delete listings" ON "listings" FOR DELETE USING (auth.uid() IN (SELECT "userId"::uuid FROM products WHERE id = "productId"));
