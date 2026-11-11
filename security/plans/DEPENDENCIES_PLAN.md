# DEPENDENCIES Fix Plan

## Changes

- `package.json` & `package-lock.json` — Restore CLOOP's `HEAD:package.json` and `HEAD:package-lock.json` (`git checkout HEAD -- package.json package-lock.json`); move `prisma` CLI to `devDependencies` (keeping `postinstall: "prisma generate"` with `devDependencies` available during Vercel build); upgrade `next` and `eslint-config-next` to `16.4.3`, `@sentry/nextjs` to latest patched `10.x` (`>=10.75.2`), `zod` to `>=4.6.6`, and run `npm audit fix` to remediate transitive High/Moderate advisories; pin exact package versions (no `^` or `~`).
- `vercel.json` — Restore CLOOP's `/api/cron/escrow-sla` schedule from `HEAD:vercel.json` (merging `/on-thi-tdv` rewrites only if TDV is intentionally co-hosted, otherwise separating `on-thi-tdv` into its own project and verifying `.vercel/project.json` points to CLOOP's Vercel project rather than `"on-thi-tdv"`).
- `public/package.json`, `public/package-lock.json`, `public/node_modules/` — Delete completely from `public/`.

## New files

- `.npmrc` — Set `save-exact=true` so future `npm install <pkg>` commands pin exact versions automatically.
- `.github/dependabot.yml` — Configure weekly automated npm security and version update PRs (`AGENTS.md` Section 8 requirement).

## Verification goals

After implementation, ALL of these must be true:

- [ ] Every dependency in `package.json` is verified as legitimate on `registry.npmjs.org`, and `package.json` belongs to `"cloop-app"` (not overwritten by `"on-thi-tdv"`).
- [ ] Exact versions are pinned across `dependencies` and `devDependencies` (zero `^` or `~` ranges) with `.npmrc` `save-exact=true`.
- [ ] `package-lock.json` is committed and synchronized with `package.json` (`npm ci --dry-run` succeeds).
- [ ] `npm audit` against the real CLOOP `package-lock.json` reports `0` `critical` and `0` `high` vulnerabilities (or documents breaking major-upgrade blockers with compensating controls).
- [ ] `npm run build` completes cleanly with the upgraded packages.

## Manual verification (for the human)

- Inspect `.vercel/project.json` locally before running `vercel` CLI commands—it currently points to `"projectName": "on-thi-tdv"`! Re-link (`vercel link`) to the real CLOOP Vercel project before deploying so you do not accidentally deploy one app over the other.
- Enable GitHub Dependabot Alerts and Dependabot Security Updates in the GitHub repository settings (`Settings -> Code security`).
