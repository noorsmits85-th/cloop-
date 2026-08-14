with open('prisma/migrations/20260814094500_normalize_naming/migration.sql', 'a', encoding='utf-8') as f:
    f.write('''

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

-- SECURE FINANCIAL TABLES (REVOKE ALL)
REVOKE ALL ON "invoices" FROM anon, authenticated;
REVOKE ALL ON "ledger_transactions" FROM anon, authenticated;
REVOKE ALL ON "disputes" FROM anon, authenticated;
REVOKE ALL ON "rental_history" FROM anon, authenticated;

-- ENABLE RLS ON PUBLIC CATALOG TABLES
ALTER TABLE "products" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "product_images" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "listings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "blog_posts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "reviews" ENABLE ROW LEVEL SECURITY;

-- POLICIES FOR PUBLIC TABLES
CREATE POLICY "Public select products" ON "products" FOR SELECT USING (true);
CREATE POLICY "Public select product_images" ON "product_images" FOR SELECT USING (true);
CREATE POLICY "Public select listings" ON "listings" FOR SELECT USING (true);
CREATE POLICY "Public select profiles" ON "profiles" FOR SELECT USING (true);
CREATE POLICY "Public select blog_posts" ON "blog_posts" FOR SELECT USING (true);
CREATE POLICY "Public select reviews" ON "reviews" FOR SELECT USING (true);

CREATE POLICY "Owner update products" ON "products" FOR UPDATE USING (auth.uid() = "userId"::uuid);
CREATE POLICY "Owner delete products" ON "products" FOR DELETE USING (auth.uid() = "userId"::uuid);

CREATE POLICY "Owner update listings" ON "listings" FOR UPDATE USING (
  auth.uid() IN (SELECT "userId"::uuid FROM products WHERE id = "productId")
);
CREATE POLICY "Owner delete listings" ON "listings" FOR DELETE USING (
  auth.uid() IN (SELECT "userId"::uuid FROM products WHERE id = "productId")
);

''')
