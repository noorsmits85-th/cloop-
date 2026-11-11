// Metadata-only verification. Never selects application rows or changes database data.
const fs = require('node:fs');
const { loadEnvConfig } = require('@next/env');
const { PrismaClient } = require('@prisma/client');
loadEnvConfig(process.cwd());
const prisma = new PrismaClient({ log: [] });
const queries = {
  original_verifier: fs.readFileSync('scripts/verify_28_tables_lockdown_status.sql', 'utf8'),
  guard_definitions: `SELECT p.proname,pg_get_functiondef(p.oid) AS definition FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname IN ('fn_guard_coin_topups_integrity','fn_guard_user_sensitive_columns','fn_guard_ledger_immutable','fn_guard_coin_ledger_immutable','fn_guard_rental_financials','fn_guard_invoice_integrity','fn_guard_withdrawal_integrity') ORDER BY 1`,
  table_access: `SELECT r.rolname AS role,c.relname AS table_name,has_table_privilege(r.oid,c.oid,'SELECT') AS can_select,has_table_privilege(r.oid,c.oid,'INSERT') AS can_insert,has_table_privilege(r.oid,c.oid,'UPDATE') AS can_update,has_table_privilege(r.oid,c.oid,'DELETE') AS can_delete FROM pg_roles r CROSS JOIN pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE r.rolname IN ('anon','authenticated') AND n.nspname='public' AND c.relkind='r' ORDER BY 1,2`,
  tables: `SELECT c.relname AS name, c.relrowsecurity AS rls, c.relforcerowsecurity AS force_rls FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','p') ORDER BY 1`,
  triggers: `SELECT c.relname AS table_name,t.tgname,t.tgenabled,p.proname,p.prosecdef,pg_get_userbyid(p.proowner) AS function_owner FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace JOIN pg_proc p ON p.oid=t.tgfoid WHERE n.nspname='public' AND NOT t.tgisinternal ORDER BY 1,2`,
  policies: `SELECT tablename,policyname,roles,cmd,qual,with_check FROM pg_policies WHERE schemaname='public' ORDER BY 1,2`,
  columns: `SELECT table_name,column_name FROM information_schema.columns WHERE table_schema='public' AND table_name IN ('coin_topups','rental_history','Invoice') ORDER BY 1,ordinal_position`,
  sensitive_column_access: `SELECT r.rolname AS role,c.relname AS table_name,a.attname AS column_name,has_column_privilege(r.oid,c.oid,a.attnum,'SELECT') AS can_select,has_column_privilege(r.oid,c.oid,a.attnum,'UPDATE') AS can_update FROM pg_roles r CROSS JOIN pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace JOIN pg_attribute a ON a.attrelid=c.oid WHERE r.rolname IN ('anon','authenticated') AND n.nspname='public' AND c.relname IN ('User','products','coin_topups') AND a.attname IN ('walletBalance','cloopCoins','role','specificAddress','amountVnd','totalCoins') AND NOT a.attisdropped ORDER BY 1,2,3`,
  constraints: `SELECT c.relname AS table_name,k.conname,k.convalidated FROM pg_constraint k JOIN pg_class c ON c.oid=k.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND k.contype='c' ORDER BY 1,2`,
  events: `SELECT evtname,evtenabled FROM pg_event_trigger ORDER BY 1`,
};
(async () => {
  const output = { checkedAt: new Date().toISOString(), mode: 'READ ONLY; metadata only', results: {} };
  try {
    await prisma.$transaction(async tx => {
      await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');
      await tx.$executeRawUnsafe("SET LOCAL statement_timeout = '10000ms'");
      for (const [name, sql] of Object.entries(queries)) output.results[name] = await tx.$queryRawUnsafe(sql);
    }, { maxWait: 15000, timeout: 45000 });
    const serialized = JSON.stringify(output, (_, value) => typeof value === 'bigint' ? value.toString() : value, 2);
    fs.writeFileSync('security/lockdown-metadata-result.json', serialized);
    console.log(JSON.stringify({ status: 'OK', tables: output.results.tables.length, triggers: output.results.triggers.length, evidence: 'security/lockdown-metadata-result.json' }));
  } catch (error) {
    // Keep credentials, connection strings, and provider error details out of logs.
    console.error(JSON.stringify({ status: 'FAILED', name: error.name, code: error.code || 'CONNECTION_OR_QUERY_ERROR', databaseConfigured: !!process.env.DATABASE_URL, reason: /reach database|connect|ENOTFOUND|timed out/i.test(error.message) ? 'NETWORK_CONNECTION' : /prepared statement/i.test(error.message) ? 'POOLER_PREPARED_STATEMENT' : /serialize|deserialize|type/i.test(error.message) ? 'RESULT_TYPE' : 'QUERY_OR_CONFIGURATION' }));
    process.exitCode = 1;
  } finally { await prisma.$disconnect(); }
})();
