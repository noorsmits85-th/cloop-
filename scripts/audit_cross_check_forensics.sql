-- FILE: scripts/audit_cross_check_forensics.sql
-- Hãy chạy thử script này ở môi trường Local trước khi đẩy lên Staging/Production
-- CHẾ ĐỘ: READ-ONLY (Chỉ truy vấn đối soát, không làm thay đổi dữ liệu)
-- MỤC ĐÍCH: Đối soát chéo Invoice, LedgerTransaction, rental_history, coin_topups, User
-- =============================================================================

-- -----------------------------------------------------------------------------
-- KIỂM TOÁN 1: PHÁT HIỆN "HÓA ĐƠN MA" (GHOST INVOICES)
-- Các hóa đơn ở trạng thái PAID/COMPLETED nhưng không có bản ghi đối ứng trong
-- LedgerTransaction hoặc có số tiền bằng 0 / âm / NaN.
-- -----------------------------------------------------------------------------
WITH normalized_invoices AS (
    SELECT
        COALESCE(to_jsonb(i)->>'id', '') AS invoice_id,
        COALESCE(to_jsonb(i)->>'userId', to_jsonb(i)->>'user_id', '') AS user_id,
        COALESCE(to_jsonb(i)->>'orderId', to_jsonb(i)->>'order_id', to_jsonb(i)->>'rentalId', '') AS order_id,
        UPPER(COALESCE(to_jsonb(i)->>'status', '')) AS status,
        COALESCE(to_jsonb(i)->>'amount', to_jsonb(i)->>'totalAmount', to_jsonb(i)->>'total_amount', '0') AS raw_amount,
        COALESCE(to_jsonb(i)->>'createdAt', to_jsonb(i)->>'created_at', '') AS created_at
    FROM public."Invoice" i
),
normalized_ledger AS (
    SELECT
        COALESCE(to_jsonb(l)->>'id', '') AS ledger_id,
        COALESCE(to_jsonb(l)->>'invoiceId', to_jsonb(l)->>'invoice_id', to_jsonb(l)->>'referenceId', to_jsonb(l)->>'reference_id', '') AS ref_invoice_id,
        COALESCE(to_jsonb(l)->>'orderId', to_jsonb(l)->>'order_id', '') AS ref_order_id,
        COALESCE(to_jsonb(l)->>'userId', to_jsonb(l)->>'user_id', '') AS user_id,
        COALESCE(to_jsonb(l)->>'amount', '0') AS raw_ledger_amount
    FROM public."LedgerTransaction" l
)
SELECT
    '1_GHOST_OR_CORRUPT_INVOICE' AS audit_category,
    ni.invoice_id,
    ni.user_id,
    ni.order_id,
    ni.status,
    ni.raw_amount AS invoice_amount,
    nl.ledger_id AS matched_ledger_id,
    nl.raw_ledger_amount AS ledger_amount,
    CASE
        WHEN ni.raw_amount IN ('NaN', 'Infinity', '-Infinity') THEN 'CRITICAL: Số tiền hóa đơn là NaN/Infinity'
        WHEN ni.raw_amount::NUMERIC <= 0 THEN 'CRITICAL: Số tiền hóa đơn <= 0'
        WHEN nl.ledger_id IS NULL THEN 'HIGH: Hóa đơn đã PAID/COMPLETED nhưng không tồn tại trong LedgerTransaction'
        WHEN ABS(ni.raw_amount::NUMERIC - ABS(nl.raw_ledger_amount::NUMERIC)) > 0.01 THEN 'HIGH: Lệch số tiền giữa Invoice và LedgerTransaction'
        ELSE 'OK'
    END AS anomaly_reason,
    ni.created_at
FROM normalized_invoices ni
LEFT JOIN normalized_ledger nl
    ON (nl.ref_invoice_id = ni.invoice_id AND ni.invoice_id <> '')
    OR (nl.ref_order_id = ni.order_id AND ni.order_id <> '')
WHERE
    ni.raw_amount IN ('NaN', 'Infinity', '-Infinity')
    OR ni.raw_amount::NUMERIC <= 0
    OR (
        ni.status IN ('PAID', 'COMPLETED', 'SETTLED', 'SUCCESS')
        AND (
            nl.ledger_id IS NULL
            OR nl.raw_ledger_amount IN ('NaN', 'Infinity', '-Infinity')
            OR ABS(ni.raw_amount::NUMERIC - ABS(nl.raw_ledger_amount::NUMERIC)) > 0.01
        )
    )
ORDER BY ni.created_at DESC;

-- -----------------------------------------------------------------------------
-- KIỂM TOÁN 2: PHÁT HIỆN "SỔ CÁI KHỐNG" (UNBACKED LEDGER INJECTIONS)
-- Các bút toán trong LedgerTransaction không gắn với bất kỳ Invoice hay coin_topups nào
-- -----------------------------------------------------------------------------
WITH normalized_ledger AS (
    SELECT
        COALESCE(to_jsonb(l)->>'id', '') AS ledger_id,
        COALESCE(to_jsonb(l)->>'userId', to_jsonb(l)->>'user_id', '') AS user_id,
        UPPER(COALESCE(to_jsonb(l)->>'type', to_jsonb(l)->>'transactionType', '')) AS tx_type,
        COALESCE(to_jsonb(l)->>'amount', '0') AS raw_amount,
        COALESCE(to_jsonb(l)->>'invoiceId', to_jsonb(l)->>'invoice_id', '') AS invoice_id,
        COALESCE(to_jsonb(l)->>'topupId', to_jsonb(l)->>'topup_id', '') AS topup_id,
        COALESCE(to_jsonb(l)->>'referenceId', to_jsonb(l)->>'reference_id', '') AS reference_id,
        COALESCE(to_jsonb(l)->>'description', to_jsonb(l)->>'note', '') AS description,
        COALESCE(to_jsonb(l)->>'createdAt', to_jsonb(l)->>'created_at', '') AS created_at
    FROM public."LedgerTransaction" l
),
all_valid_refs AS (
    SELECT COALESCE(to_jsonb(i)->>'id', '') AS ref_id, 'INVOICE' AS ref_source FROM public."Invoice" i
    UNION ALL
    SELECT COALESCE(to_jsonb(c)->>'id', '') AS ref_id, 'COIN_TOPUP' AS ref_source FROM public."coin_topups" c
    UNION ALL
    SELECT COALESCE(to_jsonb(r)->>'id', '') AS ref_id, 'RENTAL_HISTORY' AS ref_source FROM public."rental_history" r
)
SELECT
    '2_UNBACKED_LEDGER_ENTRY' AS audit_category,
    nl.ledger_id,
    nl.user_id,
    nl.tx_type,
    nl.raw_amount,
    nl.invoice_id,
    nl.topup_id,
    nl.reference_id,
    nl.description,
    CASE
        WHEN nl.raw_amount IN ('NaN', 'Infinity', '-Infinity') THEN 'CRITICAL: Bút toán chứa NaN/Infinity'
        WHEN nl.raw_amount::NUMERIC = 0 THEN 'MEDIUM: Bút toán có giá trị bằng 0'
        WHEN vr.ref_id IS NULL THEN 'CRITICAL: Bút toán sổ cái mồ côi (không khớp với Invoice, coin_topups hay rental_history)'
        ELSE 'OK'
    END AS anomaly_reason,
    nl.created_at
FROM normalized_ledger nl
LEFT JOIN all_valid_refs vr
    ON vr.ref_id IN (nl.invoice_id, nl.topup_id, nl.reference_id)
    AND vr.ref_id <> ''
WHERE
    nl.raw_amount IN ('NaN', 'Infinity', '-Infinity')
    OR nl.raw_amount::NUMERIC = 0
    OR vr.ref_id IS NULL
ORDER BY nl.created_at DESC;

-- -----------------------------------------------------------------------------
-- KIỂM TOÁN 3: ĐỐI SOÁT TIỀN THUÊ & TIỀN CỌC TRONG "rental_history" VỚI "Invoice"
-- -----------------------------------------------------------------------------
WITH normalized_rentals AS (
    SELECT
        COALESCE(to_jsonb(r)->>'id', '') AS rental_id,
        COALESCE(to_jsonb(r)->>'renterId', to_jsonb(r)->>'renter_id', to_jsonb(r)->>'userId', to_jsonb(r)->>'user_id', '') AS renter_id,
        COALESCE(to_jsonb(r)->>'ownerId', to_jsonb(r)->>'owner_id', '') AS owner_id,
        UPPER(COALESCE(to_jsonb(r)->>'status', '')) AS rental_status,
        COALESCE(to_jsonb(r)->>'rentalPrice', to_jsonb(r)->>'rental_price', to_jsonb(r)->>'totalPrice', to_jsonb(r)->>'total_price', to_jsonb(r)->>'price', '0') AS raw_rental_price,
        COALESCE(to_jsonb(r)->>'depositAmount', to_jsonb(r)->>'deposit_amount', to_jsonb(r)->>'deposit', '0') AS raw_deposit_amount,
        COALESCE(to_jsonb(r)->>'createdAt', to_jsonb(r)->>'created_at', '') AS created_at
    FROM public."rental_history" r
),
normalized_invoices AS (
    SELECT
        COALESCE(to_jsonb(i)->>'id', '') AS invoice_id,
        COALESCE(to_jsonb(i)->>'rentalId', to_jsonb(i)->>'rental_id', to_jsonb(i)->>'orderId', to_jsonb(i)->>'order_id', '') AS ref_rental_id,
        UPPER(COALESCE(to_jsonb(i)->>'status', '')) AS invoice_status,
        COALESCE(to_jsonb(i)->>'amount', to_jsonb(i)->>'totalAmount', to_jsonb(i)->>'total_amount', '0') AS raw_invoice_amount
    FROM public."Invoice" i
)
SELECT
    '3_RENTAL_DEPOSIT_OR_PRICE_TAMPERING' AS audit_category,
    nr.rental_id,
    nr.renter_id,
    nr.owner_id,
    nr.rental_status,
    nr.raw_rental_price,
    nr.raw_deposit_amount,
    ni.invoice_id,
    ni.invoice_status,
    ni.raw_invoice_amount,
    CASE
        WHEN nr.raw_rental_price IN ('NaN', 'Infinity', '-Infinity') OR nr.raw_deposit_amount IN ('NaN', 'Infinity', '-Infinity')
            THEN 'CRITICAL: Giá thuê hoặc tiền cọc chứa NaN/Infinity'
        WHEN nr.raw_rental_price::NUMERIC < 0 OR nr.raw_deposit_amount::NUMERIC < 0
            THEN 'CRITICAL: Giá thuê hoặc tiền cọc bị sửa thành số âm'
        WHEN nr.rental_status IN ('ACTIVE', 'RENTING', 'COMPLETED', 'HANDED_OVER') AND ni.invoice_id IS NULL
            THEN 'HIGH: Đơn thuê đã kích hoạt/hoàn tất nhưng không có Invoice thanh toán'
        ELSE 'OK'
    END AS anomaly_reason,
    nr.created_at
FROM normalized_rentals nr
LEFT JOIN normalized_invoices ni
    ON ni.ref_rental_id = nr.rental_id AND nr.rental_id <> ''
WHERE
    nr.raw_rental_price IN ('NaN', 'Infinity', '-Infinity')
    OR nr.raw_deposit_amount IN ('NaN', 'Infinity', '-Infinity')
    OR nr.raw_rental_price::NUMERIC < 0
    OR nr.raw_deposit_amount::NUMERIC < 0
    OR (nr.rental_status IN ('ACTIVE', 'RENTING', 'COMPLETED', 'HANDED_OVER') AND ni.invoice_id IS NULL)
ORDER BY nr.created_at DESC;

-- -----------------------------------------------------------------------------
-- KIỂM TOÁN 4: ĐỐI SOÁT "coin_topups" VỚI SỐ DƯ USER ("walletBalance" / "cloopCoins") & SỔ CÁI
-- -----------------------------------------------------------------------------
WITH user_balances AS (
    SELECT
        COALESCE(to_jsonb(u)->>'id', '') AS user_id,
        COALESCE(to_jsonb(u)->>'email', '') AS email,
        COALESCE(to_jsonb(u)->>'role', 'USER') AS role,
        COALESCE(to_jsonb(u)->>'walletBalance', to_jsonb(u)->>'balance', '0') AS raw_balance,
        COALESCE(to_jsonb(u)->>'cloopCoins', to_jsonb(u)->>'coinBalance', to_jsonb(u)->>'coin_balance', '0') AS raw_coin_balance
    FROM public."User" u
),
approved_topups AS (
    SELECT
        COALESCE(to_jsonb(c)->>'userId', to_jsonb(c)->>'user_id', '') AS user_id,
        SUM(
            CASE
                WHEN COALESCE(to_jsonb(c)->>'amount_vnd', to_jsonb(c)->>'amount', '0') IN ('NaN', 'Infinity', '-Infinity') THEN 0
                ELSE COALESCE(to_jsonb(c)->>'amount_vnd', to_jsonb(c)->>'amount', '0')::NUMERIC
            END
        ) AS total_topup_approved,
        COUNT(*) AS approved_topup_count
    FROM public."coin_topups" c
    WHERE UPPER(COALESCE(to_jsonb(c)->>'status', '')) IN ('COMPLETED', 'SUCCESS', 'PAID', 'APPROVED')
    GROUP BY COALESCE(to_jsonb(c)->>'userId', to_jsonb(c)->>'user_id', '')
),
ledger_sums AS (
    SELECT
        COALESCE(to_jsonb(l)->>'userId', to_jsonb(l)->>'user_id', '') AS user_id,
        SUM(
            CASE
                WHEN COALESCE(to_jsonb(l)->>'amount', '0') IN ('NaN', 'Infinity', '-Infinity') THEN 0
                ELSE COALESCE(to_jsonb(l)->>'amount', '0')::NUMERIC
            END
        ) AS net_ledger_amount,
        COUNT(*) AS ledger_tx_count
    FROM public."LedgerTransaction" l
    GROUP BY COALESCE(to_jsonb(l)->>'userId', to_jsonb(l)->>'user_id', '')
)
SELECT
    '4_USER_BALANCE_VS_LEDGER_AND_TOPUPS' AS audit_category,
    ub.user_id,
    ub.email,
    ub.role,
    ub.raw_balance AS current_wallet_balance,
    ub.raw_coin_balance AS current_cloop_coins,
    COALESCE(at.total_topup_approved, 0) AS total_approved_topups,
    COALESCE(ls.net_ledger_amount, 0) AS net_ledger_sum,
    CASE
        WHEN ub.raw_balance IN ('NaN', 'Infinity', '-Infinity') OR ub.raw_coin_balance IN ('NaN', 'Infinity', '-Infinity')
            THEN 'CRITICAL: Số dư tài khoản chứa NaN/Infinity'
        WHEN ub.raw_balance::NUMERIC < 0 OR ub.raw_coin_balance::NUMERIC < 0
            THEN 'CRITICAL: Số dư tài khoản bị âm'
        ELSE 'OK'
    END AS anomaly_reason
FROM user_balances ub
LEFT JOIN approved_topups at ON at.user_id = ub.user_id
LEFT JOIN ledger_sums ls ON ls.user_id = ub.user_id
WHERE
    ub.raw_balance IN ('NaN', 'Infinity', '-Infinity')
    OR ub.raw_coin_balance IN ('NaN', 'Infinity', '-Infinity')
    OR ub.raw_balance::NUMERIC <> 0
    OR ub.raw_coin_balance::NUMERIC <> 0
    OR COALESCE(ls.net_ledger_amount, 0) <> 0
    OR ub.email IN ('renter_test_e2e@test.com', 'owner_test_e2e@test.com')
ORDER BY ub.email ASC;
