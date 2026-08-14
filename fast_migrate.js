const { Client } = require('pg');
require('dotenv').config({ path: '.env' });

async function main() {
  console.log("Connecting to PostgreSQL...");
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  
  const tables = {
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
  };

  try {
    await client.query('BEGIN');
    
    for (const [oldName, newName] of Object.entries(tables)) {
      console.log(`Renaming ${oldName} to ${newName}...`);
      await client.query(`ALTER TABLE "${oldName}" RENAME TO "${newName}"`);
    }
    
    // Also include the triggers and RLS!
    const trigger_rls = [
      `CREATE OR REPLACE FUNCTION public.handle_new_user()
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
      $$ LANGUAGE plpgsql SECURITY DEFINER;`,
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
    ];

    for (const sql of trigger_rls) {
      await client.query(sql);
    }
    
    await client.query('COMMIT');
    console.log("Migration executed successfully!");
  } catch(e) {
    await client.query('ROLLBACK');
    console.error("Migration failed:", e);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
