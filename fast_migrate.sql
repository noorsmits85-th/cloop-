BEGIN;

ALTER TABLE "AccountingPeriod" RENAME TO "accounting_periods";
ALTER TABLE "AuditLog" RENAME TO "audit_logs";
ALTER TABLE "BlogInteraction" RENAME TO "blog_interactions";
ALTER TABLE "BlogPost" RENAME TO "blog_posts";
ALTER TABLE "Dispute" RENAME TO "disputes";
ALTER TABLE "Invoice" RENAME TO "invoices";
ALTER TABLE "LedgerTransaction" RENAME TO "ledger_transactions";
ALTER TABLE "Listing" RENAME TO "listings";
ALTER TABLE "ProductImage" RENAME TO "product_images";
ALTER TABLE "ProductLifecycle" RENAME TO "product_lifecycles";
ALTER TABLE "Review" RENAME TO "reviews";
ALTER TABLE "User" RENAME TO "profiles";

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

COMMIT;
