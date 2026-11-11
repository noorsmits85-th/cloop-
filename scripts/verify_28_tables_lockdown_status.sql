-- FILE: scripts/verify_28_tables_lockdown_status.sql
-- Hãy chạy thử script này ở môi trường Local trước khi đẩy lên Staging/Production
-- MỤC ĐÍCH: Kiểm tra trạng thái cấu hình RLS, FORCE RLS, quyền hiệu lực (bao gồm PUBLIC/anon/authenticated),
--           quyền cấp cột nhạy cảm, trạng thái kích hoạt Triggers và hiệu lực CHECK Constraint.
-- =============================================================================

WITH all_public_tables AS (
    SELECT
        ROW_NUMBER() OVER (ORDER BY c.relname) AS table_no,
        c.oid AS table_oid,
        c.relname AS table_name,
        c.relrowsecurity AS rls_enabled,
        c.relforcerowsecurity AS rls_forced
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r'
),
policy_info AS (
    SELECT
        tablename AS table_name,
        COUNT(*) AS policy_count,
        STRING_AGG(policyname || ' (' || cmd || ')', ', ' ORDER BY policyname) AS policy_names,
        BOOL_OR(
            tablename NOT IN ('products', 'Listing', 'ProductImage', 'Review', 'BlogPost')
            OR cmd <> 'SELECT'
            OR qual = 'true'
        ) AS has_unexpected_policy
    FROM pg_policies
    WHERE schemaname = 'public'
    GROUP BY tablename
),
trigger_info AS (
    SELECT
        c.relname AS table_name,
        COUNT(t.tgname) FILTER (WHERE t.tgenabled::text = 'O') AS active_trigger_count,
        STRING_AGG(t.tgname || '[' || t.tgenabled::text || ']', ', ' ORDER BY t.tgname) AS trigger_names
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND NOT t.tgisinternal
    GROUP BY c.relname
),
effective_client_write_or_table_read AS (
    SELECT
        c.relname AS table_name,
        STRING_AGG(r.rolname || ':' || p.priv, ', ' ORDER BY r.rolname, p.priv) AS exposed_privileges
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    CROSS JOIN pg_roles r
    CROSS JOIN (VALUES ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE'), ('TRUNCATE')) AS p(priv)
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND r.rolname IN ('anon', 'authenticated')
      AND has_table_privilege(r.oid, c.oid, p.priv)
      AND NOT (p.priv = 'SELECT' AND c.relname IN ('Listing'))
    GROUP BY c.relname
),
sensitive_column_exposure AS (
    SELECT
        c.relname AS table_name,
        STRING_AGG(r.rolname || ':' || a.attname || ':' || p.priv, ', ' ORDER BY r.rolname, a.attname, p.priv) AS exposed_columns
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_attribute a ON a.attrelid = c.oid AND NOT a.attisdropped AND a.attnum > 0
    CROSS JOIN pg_roles r
    CROSS JOIN (VALUES ('SELECT'), ('INSERT'), ('UPDATE')) AS p(priv)
    WHERE n.nspname = 'public'
      AND r.rolname IN ('anon', 'authenticated')
      AND (
          (c.relname = 'User' AND a.attname IN ('email', 'password', 'walletBalance', 'pendingWithdrawalBalance', 'cloopCoins', 'role', 'isVerified'))
          OR (c.relname = 'products' AND a.attname IN ('specificAddress', 'wardCode', 'districtId', 'latitude', 'longitude'))
          OR (c.relname = 'coin_topups' AND a.attname IN ('amountVnd', 'baseCoins', 'bonusCoins', 'totalCoins'))
          OR (c.relname = 'ProductImage' AND a.attname IN ('storageProvider', 'publicId', 'bytes'))
          OR (c.relname = 'Listing' AND a.attname IN ('snapshot'))
      )
      AND has_column_privilege(r.oid, c.oid, a.attnum, p.priv)
    GROUP BY c.relname
),
constraint_info AS (
    SELECT
        c.relname AS table_name,
        BOOL_AND(k.convalidated) AS all_check_constraints_validated
    FROM pg_constraint k
    JOIN pg_class c ON c.oid = k.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND k.contype = 'c'
    GROUP BY c.relname
)
SELECT
    t.table_no AS "STT",
    t.table_name AS "Tên Bảng CLOOP",
    t.rls_enabled AS "RLS Enabled",
    t.rls_forced AS "FORCE RLS",
    COALESCE(pi.policy_count, 0) AS "Số RLS Policies",
    COALESCE(ti.active_trigger_count, 0) AS "Số Triggers Bật",
    COALESCE(ti.trigger_names, 'Không có') AS "Danh Sách Triggers",
    COALESCE(ec.exposed_privileges, 'Không lộ quyền cấp bảng') AS "Quyền Cấp Bảng Client",
    COALESCE(sc.exposed_columns, 'Không lộ cột nhạy cảm') AS "Quyền Cấp Cột Nhạy Cảm",
    CASE
        WHEN t.rls_enabled IS NOT TRUE OR t.rls_forced IS NOT TRUE THEN 'DEFECT: THIẾU RLS/FORCE RLS'
        WHEN ec.exposed_privileges IS NOT NULL THEN 'DEFECT: LỘ QUYỀN CẤP BẢNG'
        WHEN sc.exposed_columns IS NOT NULL THEN 'DEFECT: LỘ CỘT NHẠY CẢM'
        WHEN COALESCE(pi.has_unexpected_policy, FALSE) IS TRUE THEN 'DEFECT: POLICY QUÁ RỘNG (QUAL=TRUE HOẶC BẢNG LẠ)'
        WHEN t.table_name IN ('User', 'Invoice', 'LedgerTransaction', 'coin_ledger_entries', 'coin_topups', 'rental_history', 'withdrawal_requests')
             AND COALESCE(ti.active_trigger_count, 0) < 1 THEN 'DEFECT: THIẾU TRIGGER BẢO VỆ TÀI CHÍNH'
        WHEN t.table_name = 'User' AND COALESCE(ci.all_check_constraints_validated, FALSE) IS NOT TRUE THEN 'DEFECT: CHECK CONSTRAINT CHƯA VALIDATE'
        ELSE 'METADATA_CONTROLS_VERIFIED'
    END AS "Kết Quả Kiểm Định Cấu Hình"
FROM all_public_tables t
LEFT JOIN policy_info pi ON pi.table_name = t.table_name
LEFT JOIN trigger_info ti ON ti.table_name = t.table_name
LEFT JOIN effective_client_write_or_table_read ec ON ec.table_name = t.table_name
LEFT JOIN sensitive_column_exposure sc ON sc.table_name = t.table_name
LEFT JOIN constraint_info ci ON ci.table_name = t.table_name
ORDER BY t.table_no ASC;
