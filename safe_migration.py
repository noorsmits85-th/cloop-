import re

with open('prisma/migrations/20260814094500_normalize_naming/clean4.sql', 'r', encoding='utf-8') as f:
    sql = f.read()

# Separate statements
statements = sql.split(';')
statements = [s.strip() for s in statements if s.strip()]

drop_fk = []
drop_table = []
create_table = []
create_index = []
add_fk = []

for s in statements:
    if 'DROP CONSTRAINT' in s and 'ALTER TABLE' in s and 'ADD CONSTRAINT' not in s:
        drop_fk.append(s + ';')
    elif s.startswith('DROP TABLE'):
        drop_table.append(s + ';')
    elif s.startswith('CREATE TABLE'):
        create_table.append(s + ';')
    elif s.startswith('CREATE UNIQUE INDEX') or s.startswith('CREATE INDEX'):
        create_index.append(s + ';')
    elif 'ADD CONSTRAINT' in s and 'ALTER TABLE' in s:
        add_fk.append(s + ';')

# Table map
table_map = {
    'AccountingPeriod': 'accounting_periods',
    'AuditLog': 'audit_logs',
    'BlogInteraction': 'blog_interactions',
    'BlogPost': 'blog_posts',
    'Dispute': 'disputes',
    'Invoice': 'invoices',
    'LedgerTransaction': 'ledger_transactions',
    'Listing': 'listings',
    'ProductImage': 'product_images',
    'ProductLifecycle': 'product_lifecycles',
    'Review': 'reviews',
    'User': 'profiles'
}

copy_data = []

# For each create table, extract columns to explicitly map them
for s in create_table:
    match = re.search(r'CREATE TABLE "([^"]+)" \((.*?)\)', s, re.DOTALL)
    if match:
        new_table = match.group(1)
        cols = []
        for line in match.group(2).split('\n'):
            line = line.strip()
            if line.startswith('"'):
                col = line.split('"')[1]
                if col != 'CONSTRAINT':
                    cols.append(f'"{col}"')
        
        # Find old table
        old_table = None
        for old, new in table_map.items():
            if new == new_table:
                old_table = old
                break
        
        if old_table:
            cols_str = ", ".join(cols)
            copy_data.append(f'INSERT INTO "{new_table}" ({cols_str}) SELECT {cols_str} FROM "{old_table}";')

trigger_rls = [
    """-- UPDATE TRIGGER FOR PROFILES
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
$$ LANGUAGE plpgsql SECURITY DEFINER;""",
    'REVOKE ALL ON "invoices" FROM anon, authenticated;',
    'REVOKE ALL ON "ledger_transactions" FROM anon, authenticated;',
    'REVOKE ALL ON "disputes" FROM anon, authenticated;',
    'REVOKE ALL ON "rental_history" FROM anon, authenticated;',
    'ALTER TABLE "products" ENABLE ROW LEVEL SECURITY;',
    'ALTER TABLE "product_images" ENABLE ROW LEVEL SECURITY;',
    'ALTER TABLE "listings" ENABLE ROW LEVEL SECURITY;',
    'ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;',
    'ALTER TABLE "blog_posts" ENABLE ROW LEVEL SECURITY;',
    'ALTER TABLE "reviews" ENABLE ROW LEVEL SECURITY;',
    'CREATE POLICY "Public select products" ON "products" FOR SELECT USING (true);',
    'CREATE POLICY "Public select product_images" ON "product_images" FOR SELECT USING (true);',
    'CREATE POLICY "Public select listings" ON "listings" FOR SELECT USING (true);',
    'CREATE POLICY "Public select profiles" ON "profiles" FOR SELECT USING (true);',
    'CREATE POLICY "Public select blog_posts" ON "blog_posts" FOR SELECT USING (true);',
    'CREATE POLICY "Public select reviews" ON "reviews" FOR SELECT USING (true);',
    'CREATE POLICY "Owner update products" ON "products" FOR UPDATE USING (auth.uid() = "userId"::uuid);',
    'CREATE POLICY "Owner delete products" ON "products" FOR DELETE USING (auth.uid() = "userId"::uuid);',
    'CREATE POLICY "Owner update listings" ON "listings" FOR UPDATE USING (auth.uid() IN (SELECT "userId"::uuid FROM products WHERE id = "productId"));',
    'CREATE POLICY "Owner delete listings" ON "listings" FOR DELETE USING (auth.uid() IN (SELECT "userId"::uuid FROM products WHERE id = "productId"));'
]

# Write out the new order
final_script = (
    "\n\n".join(create_table) + "\n\n" +
    "\n\n".join(create_index) + "\n\n" +
    "\n\n".join(copy_data) + "\n\n" +
    "\n\n".join(drop_fk) + "\n\n" +
    "\n\n".join(drop_table) + "\n\n" +
    "\n\n".join(add_fk) + "\n\n" +
    "\n\n".join(trigger_rls) + "\n"
)

with open('prisma/migrations/20260814094500_normalize_naming/clean5.sql', 'w', encoding='utf-8') as f:
    f.write(final_script)
