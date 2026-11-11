-- FILE: scripts/remediate_and_ban_e2e_accounts.sql
-- Hãy chạy thử script này ở môi trường Local trước khi đẩy lên Staging/Production
-- MỤC ĐÍCH: Khóa vĩnh viễn 2 tài khoản E2E test (renter_test_e2e@test.com,
--           owner_test_e2e@test.com) và thu hồi toàn bộ 480.000đ ảo về 0.
--           Tuyệt đối KHÔNG dùng DROP TABLE hay TRUNCATE.
-- =============================================================================

BEGIN;

DO $$
DECLARE
    target_emails TEXT[] := ARRAY['renter_test_e2e@test.com', 'owner_test_e2e@test.com'];
    rec RECORD;
    old_bal NUMERIC := 0;
    old_coin NUMERIC := 0;
    total_clawback NUMERIC := 0;
    has_wallet_balance BOOLEAN;
    has_pending_withdrawal BOOLEAN;
    has_cloop_coins BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'User' AND column_name = 'walletBalance'
    ) INTO has_wallet_balance;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'User' AND column_name = 'pendingWithdrawalBalance'
    ) INTO has_pending_withdrawal;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'User' AND column_name = 'cloopCoins'
    ) INTO has_cloop_coins;

    FOR rec IN
        SELECT
            id,
            email,
            CASE
                WHEN COALESCE(to_jsonb(u)->>'walletBalance', to_jsonb(u)->>'balance') IN ('NaN', 'Infinity', '-Infinity')
                  OR COALESCE(to_jsonb(u)->>'walletBalance', to_jsonb(u)->>'balance') IS NULL THEN 0
                ELSE COALESCE(to_jsonb(u)->>'walletBalance', to_jsonb(u)->>'balance')::NUMERIC
            END AS current_bal,
            CASE
                WHEN COALESCE(to_jsonb(u)->>'cloopCoins', to_jsonb(u)->>'coinBalance') IN ('NaN', 'Infinity', '-Infinity')
                  OR COALESCE(to_jsonb(u)->>'cloopCoins', to_jsonb(u)->>'coinBalance') IS NULL THEN 0
                ELSE COALESCE(to_jsonb(u)->>'cloopCoins', to_jsonb(u)->>'coinBalance')::NUMERIC
            END AS current_coin
        FROM public."User" u
        WHERE LOWER(email) = ANY(target_emails)
        FOR UPDATE
    LOOP
        old_bal := rec.current_bal;
        old_coin := rec.current_coin;
        total_clawback := total_clawback + old_bal + old_coin;

        RAISE NOTICE 'Đang xử lý thu hồi và khóa tài khoản: % (ID: %) | Số dư tiền cũ: % | Số dư xu cũ: %',
            rec.email, rec.id, old_bal, old_coin;

        IF has_wallet_balance THEN
            EXECUTE 'UPDATE public."User" SET "walletBalance" = 0 WHERE id = $1' USING rec.id;
        END IF;

        IF has_pending_withdrawal THEN
            EXECUTE 'UPDATE public."User" SET "pendingWithdrawalBalance" = 0 WHERE id = $1' USING rec.id;
        END IF;

        IF has_cloop_coins THEN
            EXECUTE 'UPDATE public."User" SET "cloopCoins" = 0 WHERE id = $1' USING rec.id;
        END IF;

        IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'coin_topups') THEN
            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_schema = 'public' AND table_name = 'coin_topups' AND column_name = 'user_id'
            ) THEN
                EXECUTE 'UPDATE public."coin_topups" SET status = ''REJECTED_E2E_CLAWBACK'' WHERE user_id::TEXT = $1::TEXT AND UPPER(status) = ''PENDING''' USING rec.id;
            ELSIF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_schema = 'public' AND table_name = 'coin_topups' AND column_name = 'userId'
            ) THEN
                EXECUTE 'UPDATE public."coin_topups" SET status = ''REJECTED_E2E_CLAWBACK'' WHERE "userId"::TEXT = $1::TEXT AND UPPER(status) = ''PENDING''' USING rec.id;
            END IF;
        END IF;
    END LOOP;

    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'auth' AND table_name = 'users'
    ) THEN
        UPDATE auth.users
        SET
            banned_until = '2099-12-31 23:59:59+00'::timestamptz,
            raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object(
                'banned', true,
                'ban_reason', 'SECURITY_LOCKDOWN_E2E_TEST_ACCOUNT_CLAWBACK_480000_VND',
                'clawback_at', NOW()
            ),
            updated_at = NOW()
        WHERE LOWER(email) = ANY(target_emails);
    END IF;

    RAISE NOTICE 'HOÀN TẤT THU HỒI: Tổng số tiền/xu ảo đã thu hồi về 0 trên 2 tài khoản E2E là: % VNĐ.', total_clawback;
END $$;

COMMIT;

SELECT
    id,
    email,
    to_jsonb(u)->>'role' AS role,
    to_jsonb(u)->>'walletBalance' AS wallet_balance_after_clawback,
    to_jsonb(u)->>'pendingWithdrawalBalance' AS pending_withdrawal_after_clawback,
    to_jsonb(u)->>'cloopCoins' AS cloop_coins_after_clawback
FROM public."User" u
WHERE LOWER(email) IN ('renter_test_e2e@test.com', 'owner_test_e2e@test.com');
