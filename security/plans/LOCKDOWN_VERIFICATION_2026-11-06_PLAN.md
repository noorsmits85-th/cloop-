# Follow-up plan for verified lockdown defects

Audit-only request: no application or database fixes were applied.

1. Correct the coin guard to the actual camelCase schema; cover positive values, immutable amounts, ownership and allowed transitions with local database tests.
2. Decide whether boost events belong in a separate event log or need a valid nonzero ledger model. Reconcile the webhook and append-only ledger contract; test retry idempotency locally.
3. Place financial invariants on the actual Invoice columns. Preserve existing foreign keys and constraints; remove misleading claims about rental_history financial coverage.
4. Replace the verifier's absolute safety verdict with granular checks for effective table/column privileges, policy definitions, enabled triggers, matching columns and constraint validation. Report unknowns explicitly.
5. Scope image reads to intended public parent products; remove permissive TDV policies after verifying server access requirements.
6. Review SECURITY DEFINER actor detection and privileged RPC paths. Independently test session claims and sensitive INSERT/UPDATE authorization in a local database.
7. Assess existing balances without exporting personal records, then validate the balance constraint after resolving any legacy violations.

Verification goals: local tests must fail for invalid top-up amounts and unauthorized amount changes; legitimate boost payments must commit exactly once; images of private/deleted products must follow the intended visibility rules; a deliberately disabled or misconfigured guard must not receive a passing guard result.

Hãy chạy thử script này ở môi trường Local trước khi đẩy lên Staging/Production khi triển khai các thay đổi Database ở trên.
