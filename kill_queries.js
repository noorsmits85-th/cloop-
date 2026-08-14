const { Client } = require('pg');
require('dotenv').config({ path: '.env' });

async function main() {
  console.log("Connecting to PostgreSQL...");
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  
  try {
    const res = await client.query(`
      SELECT pid, query 
      FROM pg_stat_activity 
      WHERE state = 'active' 
        AND pid <> pg_backend_pid();
    `);
    
    console.log("Active Queries:", res.rows);
    
    for (const row of res.rows) {
      console.log(`Cancelling query for PID ${row.pid}...`);
      await client.query(`SELECT pg_terminate_backend(${row.pid})`);
    }
  } catch(e) {
    console.error("Failed:", e);
  } finally {
    await client.end();
  }
}

main();
