# FRONTEND_SECRETS Fix Plan

## Changes

- `public/` — Delete `public/api/`, `public/scripts/`, `public/node_modules/` (removing all 211 static `.map` files), `public/.vercel/`, `public/package*.json`, and `public/vercel.json`.
- `js/config.js` & `public/js/config.js` — Remove `PAYMENT_CONFIG.presetCodes` (`lines 33-118`) completely; validate license redemptions exclusively server-side against PostgreSQL.
- `js/auth.js` & `public/js/auth.js` — Remove `DEFAULT_SEED_USERS`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `window.supabase.createClient`, and `localStorage` session token storage; authenticate exclusively via server-side `/api/tdv/*` endpoints with `HttpOnly` cookies.
- `index.html` & `public/index.html` — Remove `<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>` (`line 347`) once browser Supabase calls are removed (or pin exact version with `integrity="sha384-..." crossorigin="anonymous"`).
- `quiz-system.html` — Remove from workspace root (or move outside web-reachable paths and delete `openAdminModal()` `localStorage` key storage).
- `src/lib/env.ts`, `src/lib/prisma.ts`, `lib/payos.ts`, `src/lib/cloudinary.ts` — Add `import "server-only";` at line 1 and remove `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET` if unused by client code.

## New files

- None (install `server-only` package in `package.json` if not already transitive via Next.js).

## Verification goals

After implementation, ALL of these must be true:

- [ ] Zero secret keys, DB connection strings, seed passwords, or commercial license codes exist in any frontend or `public/` file.
- [ ] All sensitive third-party and database operations proxy through authenticated backend routes/Server Actions.
- [ ] Only publishable/public identifiers exist in client-side code and `NEXT_PUBLIC_*` variables.
- [ ] Server-only modules (`env.ts`, `prisma.ts`, `supabase-admin.ts`, `payos.ts`) enforce `import "server-only"`.
- [ ] Production build serves zero `.js.map` files (`next.config.ts` `productionBrowserSourceMaps: false` and `0` `.map` files in `public/`).

## Manual verification (for the human)

- In Cloudinary Dashboard -> Settings -> Upload -> Upload Presets, verify that any unsigned upload preset is disabled or deleted so all uploads require server-side API signatures.
- After deployment, run `python .agents/skills/vibe-check/scripts/check.py <PRODUCTION_URL> --only frontend,secrets` to verify deployed JS bundles contain no leaked tokens or `.js.map` source maps.
