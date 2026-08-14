const { Client } = require('pg');
const fs = require('fs');
require('dotenv').config({ path: '.env' });

async function main() {
  const sql = fs.readFileSync('prisma/migrations/20260814094500_normalize_naming/clean2.sql', 'utf8');
  console.log("Connecting to PostgreSQL...");
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  
  console.log("Executing SQL migration...");
  await client.query(sql);
  
  console.log("Migration executed successfully!");
  await client.end();
}

main().catch(e => {
  console.error("Migration failed:");
  console.error(e);
  process.exit(1);
});
