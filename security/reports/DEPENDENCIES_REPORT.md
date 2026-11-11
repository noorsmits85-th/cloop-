# DEPENDENCIES Security Report

## Status: CRITICAL

## Findings

Auditing `package.json`, `package-lock.json`, `public/package.json`, and `HEAD:package.json` / `HEAD:package-lock.json` uncovered both a critical workspace manifest overwrite (`on-thi-tdv` replaced `cloop-app`) and **20 known npm vulnerabilities (2 CRITICAL, 14 HIGH, 4 MODERATE)** in CLOOP's real `HEAD:package-lock.json`, alongside unpinned `^` ranges across 90% of production dependencies.

1. **CRITICAL — Workspace `package.json`, `package-lock.json` & `vercel.json` Overwritten by `on-thi-tdv`**
   - Root `package.json` (`lines 1-14`) and `package-lock.json` were overwritten by `"name": "on-thi-tdv"` containing only 3 dependencies (`@supabase/supabase-js@^2.118.0`, `nodemailer@^10.2.1`, `pg@^8.23.1`) and `"start": "node server.js"` (where `server.js` does not exist).
   - This wiped all 30 CLOOP dependencies (`next`, `react`, `@prisma/client`, `@payos/node`, `zod`, `@upstash/ratelimit`, `@sentry/nextjs`, etc.) from `package.json`, overwrote `vercel.json` (deleting CLOOP's `/api/cron/escrow-sla` cron schedule), and caused `npm audit` in the working directory to falsely report `0 vulnerabilities` by scanning only the 3 `on-thi-tdv` packages.

2. **CRITICAL — 20 Known Vulnerabilities (2 CRITICAL, 14 HIGH, 4 MODERATE) in Real CLOOP `HEAD:package-lock.json`**
   - Auditing `HEAD:package.json` + `HEAD:package-lock.json` (`786` total locked packages, `327` prod) via `npm audit --package-lock-only --json` revealed **20 vulnerabilities**:
     - **CRITICAL (2)**:
       - `next` (`16.2.9`, vulnerable range `9.3.4-canary.0 - 16.4.0`) — Non-breaking patch fix available: `next@16.4.3`.
       - `@sentry/nextjs` (`^10.70.0`, vulnerable range `10.0.0-alpha.0 - 10.75.1`) — Fix available (`>=10.75.2`).
     - **HIGH (14)**:
       - `zod` (`<4.6.6`, currently `^4.4.3`), `sharp` (`<=0.35.5-rc.1`), `postcss` (`<=8.5.22`), `next-cloudinary` (`5.20.0 - 7.0.0-beta.17`), `@cloudinary-util/url-loader`, `prisma` & `@prisma/config` (`6.13.0-dev.1 - 7.10.0`), `deepmerge-ts`, `brace-expansion`, `browserslist`, `fast-uri`, `js-yaml`, `nanoid`, `source-map-js`.
     - **MODERATE (4)**:
       - `@tailwindcss/postcss`, `baseline-browser-mapping`, `gaxios`, `uuid` (`<11.1.1`).

3. **MEDIUM — Unpinned Caret (`^`) Version Ranges & Build-Time CLI in Production `dependencies`**
   - In `HEAD:package.json`, **27 of 30 `dependencies`** and **8 of 9 `devDependencies`** (including bare major ranges `^4`, `^5`, `^9`, `^19`, `^20`) use caret `^` ranges rather than exact pinned versions (`next`, `react`, `react-dom`, and `eslint-config-next` are the only 4 exact-pinned packages).
   - `prisma` (`^6.19.3`, the migration/CLI toolchain pulling in `@prisma/config` and `deepmerge-ts`) is placed in production `dependencies` instead of `devDependencies`.
   - In `on-thi-tdv` (`package.json` / `public/package.json`), 3 of 3 dependencies use `^` ranges.

## What's at risk

- **Exploitable Framework & Validation CVEs in Production**: Running `next@16.2.9`, `@sentry/nextjs` `<10.75.2`, `sharp` `<=0.35.5-rc.1`, and `zod` `<4.6.6` exposes the live Next.js App Router, image optimizer, and schema validator to publicly disclosed Critical and High CVEs.
- **Broken Deployment & Missing Escrow Cron**: Deploying the current working tree breaks Next.js builds completely and disables `/api/cron/escrow-sla` automatic escrow SLA settlement.
- **Supply-Chain Drift**: Unpinned `^` ranges allow fresh installs without `npm ci` to pull newly published minor/patch releases before review.

## What's already secure

- **100% Legitimate Official Registry Packages**: All 39 packages in `HEAD:package.json` and all 3 packages in `on-thi-tdv` were verified as established, high-download packages on `https://registry.npmjs.org` with SHA-512 integrity hashes in `package-lock.json` (zero typosquatting or slopsquatting packages found).
- **Lockfile Committed in `HEAD`**: `HEAD` properly tracked `package-lock.json`.

## Recommendations

1. **Restore CLOOP `package.json`, `package-lock.json`, and `vercel.json` immediately**: Revert the `on-thi-tdv` manifest collision (`git checkout HEAD -- package.json package-lock.json vercel.json`, adding `"pg"` / `"nodemailer"` only if TDV routes remain intentionally hosted inside CLOOP, or isolate `on-thi-tdv` into its own repository).
2. **Patch Critical and High npm vulnerabilities**:
   - Upgrade `next` and `eslint-config-next` to `16.4.3` (or latest patched `16.x`), `@sentry/nextjs` to `>=10.75.2`, `zod` to `>=4.6.6`, and run `npm audit fix` for non-breaking transitive updates (`nanoid`, `brace-expansion`, `js-yaml`, `fast-uri`, `browserslist`, `source-map-js`, `uuid`, `gaxios`, `postcss`, `sharp`).
   - Evaluate major upgrades for `next-cloudinary@7.0.0` and `prisma@7.10.1` (`@prisma/client@7.10.1`) on a staging branch, and move `prisma` CLI from `dependencies` to `devDependencies`.
3. **Pin exact versions & enforce `npm ci` + Dependabot**: Strip `^` / `~` prefixes across `dependencies` and `devDependencies` (`save-exact=true` in `.npmrc`), commit the updated `package-lock.json`, and enable GitHub Dependabot / `npm audit --audit-level=high` in CI.
