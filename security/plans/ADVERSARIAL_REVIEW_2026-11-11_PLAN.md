# CLOOP prioritized remediation plan

Review scope: `../reports/ADVERSARIAL_REVIEW_2026-11-11.md`. No application fixes or deployment were included in this review; existing working-tree changes were preserved.

## Priority 1: private data and financial/admin identity

- `package.json` and lockfile: urgently triage the saved npm audit (2 critical/14 high package entries), update affected dependencies after compatibility review, and verify advisories against enabled framework/provider features. No blind `npm audit fix --force`.

- `app/actions/closet.ts`: explicit public projection; hide unpublished/hidden products and listings; omit location precision/snapshots; bound pagination. Add owner-only path where needed.
- `app/actions/support.ts`: independent guest credential and server ownership binding on every ticket operation, including account claim. Add durable rate limiting and bounded schemas.
- `src/utils/bank-kyc.ts`, `app/actions/user.ts`, `app/actions/withdrawal.ts`, KYC payment handlers: replace partial name matching, distinguish payment/phone verification from legal identity, verify bank/account binding through a trusted provider, require recent step-up on financial changes.
- `src/lib/auth.ts`: verified MFA assurance on both admin guards; short admin session and step-up policy. Audit admin mutations without logging secrets.

## Priority 2: abuse prevention and deployment controls

- `middleware.ts`, `src/lib/request-ip.ts`, both rate-limit utilities and login actions: remove spoofable sensitive prefetch exemptions, bind to authenticated principal where appropriate, define ingress trust, use durable distributed limits.
- Mobile/checkout clients and logout: remove sensitive localStorage persistence and clear legacy keys; store address/bank preferences in authenticated backend records.
- Deploy reviewed header configuration after CSP compatibility checks and rerun HTTP verification. Do not equate a local code change with deployment remediation.
- Withdrawal transactions: verify concurrency first; lock user before eligibility reads, pass transaction client to reconciliation, enforce idempotency and pending/day invariants with safe additive DB changes if required.

## Verification goals

- [ ] Anonymous visitor cannot receive another user's hidden products, exact coordinates or listing snapshots.
- [ ] Public pagination is bounded; public DTO contains approved fields only.
- [ ] Guest B cannot read/write/resume/claim guest A's ticket, even with its ID.
- [ ] Account B cannot access account A's support/financial data.
- [ ] Different full beneficiary names are rejected; attested bank/account identity is checked server-side.
- [ ] AAL1 admin and AAL2 ordinary user are denied; recent AAL2 admin can perform authorized operations.
- [ ] Both forged prefetch headers still invoke sensitive rate limits and result in 429 when exhausted.
- [ ] Actual proxy cannot be used to choose arbitrary limiter identities; limit holds across instances.
- [ ] Browser storage contains no bank account, recipient address/phone, or persistent sensitive identity after migration/logout.
- [ ] Deployed HTML/API/static/error responses have effective CSP/framing controls and core flows still work.
- [ ] Parallel withdrawals preserve daily cap, at most one pending request, nonnegative balance and consistent audit records against disposable PostgreSQL.
- [ ] Repair video test fixtures to include real-shaped integrity anchors; run all 82 tests without weakening authorization or evidence validation.
- [ ] Complete dependency advisory scan and git-history secret scan; verify rotation of previously exposed credentials separately.

## Database and deployment verification

No SQL migration is supplied by this audit. Any later database changes must preserve constraints, foreign keys and existing records. Hãy chạy thử script này ở môi trường Local trước khi đẩy lên Staging/Production.

Use synthetic accounts, synthetic balances, isolated storage and payment sandbox for mutation tests. Recheck reports against the deployed commit after remediation; a successful mocked harness is not a production integration test.
