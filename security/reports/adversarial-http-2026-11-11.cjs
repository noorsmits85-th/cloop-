// Narrow read-only HTTP fallback: Python scanner runtime is unavailable.
// Do not print bodies or credentials. No login, state changes or personal-data enumeration.
const fs = require('node:fs');
const base = 'https://cloop-sable.vercel.app';
const paths = ['/', '/.env', '/.git/config', '/backup.sql', '/api-docs', '/api/pricing/suggest-tiers?basePrice=10000', '/api/storage/webhook-dispatcher', '/api/disputes/evidence-stream', '/admin', '/my-closet/wallet'];
(async () => {
  const results = [];
  for (const path of paths) {
    try {
      const res = await fetch(base + path, { redirect: 'manual', signal: AbortSignal.timeout(12000), headers: { 'user-agent': 'CLOOP-authorized-readonly-security-review', origin: 'https://security-test.invalid' } });
      const body = await res.text();
      const sensitive = res.status === 200 && (/\[core\][\s\S]*repositoryformatversion/.test(body) || /(?:^|\n)(?:DATABASE_URL|SUPABASE_SERVICE_ROLE_KEY|PAYOS_API_KEY)\s*=/.test(body));
      if (sensitive) console.error('SENSITIVE FILE EXPOSED: rotate credentials immediately; body suppressed: ' + path);
      results.push({ path, status: res.status, sensitiveFileSignatureDetected: sensitive, headers: Object.fromEntries(['content-type', 'content-security-policy', 'strict-transport-security', 'x-frame-options', 'x-content-type-options', 'referrer-policy', 'permissions-policy', 'access-control-allow-origin', 'access-control-allow-credentials'].map(k => [k, res.headers.get(k)])), redirectPath: res.headers.get('location')?.split('?')[0] || null });
    } catch (err) {
      results.push({ path, error: err.cause?.code || err.name });
      if (results.length === 1) break;
    }
  }
  const output = { date: '2026-11-11', target: base, mode: 'read-only GET; no response bodies retained', results };
  fs.writeFileSync('security/reports/adversarial-http-2026-11-11.json', JSON.stringify(output, null, 2) + '\n');
  console.log(JSON.stringify(output, null, 2));
})().catch(err => { console.error(err.name); process.exitCode = 1; });
