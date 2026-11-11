-- =============================================================================
-- FILE: scripts/emergency_lockdown_ultimatum_v2.sql
-- Hãy chạy thử script này ở môi trường Local trước khi đẩy lên Staging/Production
-- TARGET: CLOOP Supabase PostgreSQL (Public Schema - Dynamic All Tables)
-- MỤC ĐÍCH: Khóa bảo mật RLS + FORCE RLS mọi bảng trong schema public,
--           thu hồi quyền anon/authenticated, xóa các policy dư thừa (như TDV allow_all),
--           kiểm tra và VALIDATE constraint số dư, bảo vệ bất biến sổ cái, hóa đơn,
--           nạp xu, rút tiền, đơn thuê theo đúng tên cột thực tế trong DB.
--           Tuyệt đối KHÔNG dùng DROP TABLE hay TRUNCATE.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- BƯỚC 1: KÍCH HOẠT VÀ ÉP BUỘC RLS (ROW LEVEL SECURITY) TRÊN TOÀN BỘ BẢNG PUBLIC
--         THU HỒI QUYỀN TRUY CẬP TRỰC TIẾP TỪ PUBLIC, ANON, AUTHENTICATED
--         VÀ DỌN SẠCH CÁC POLICY PERMISSIVE DƯ THỪA (VD: allow_all_tdv_*)
-- -----------------------------------------------------------------------------
DO $$
DECLARE
    tbl RECORD;
    pol RECORD;
BEGIN
    FOR tbl IN
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl.tablename);
        EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY;', tbl.tablename);
        EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC, anon, authenticated;', tbl.tablename);
    END LOOP;

    -- Xóa mọi RLS policy trên các bảng không thuộc 4 bảng hiển thị cửa hàng công khai
    FOR pol IN
        SELECT tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename NOT IN ('products', 'Listing', 'ProductImage', 'Review')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', pol.policyname, pol.tablename);
    END LOOP;
END $$;

-- Thu hồi quyền mặc định cho các bảng/sequences/functions tạo mới trong tương lai
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM PUBLIC, anon, authenticated;

-- Chỉ mở quyền SELECT cấp độ CỘT AN TOÀN (tuyệt đối KHÔNG cấp quyền đọc specificAddress, wardCode, districtId, latitude, longitude)
-- cho bảng hiển thị cửa hàng, còn bảng User, đơn hàng, ví, hóa đơn giữ nguyên REVOKE ALL 100% đối với anon/authenticated
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'products') THEN
        REVOKE ALL ON TABLE public."products" FROM PUBLIC, anon, authenticated;
        GRANT SELECT (
            id, title, description, size, bust, waist, hips, gender,
            condition, category, brand, color, material, style, occasion,
            season, province, "userId", status, "isDeleted", "createdAt",
            "updatedAt", "boostExpiresAt", "lastBumpedAt", "isHighlighted", "boostScore"
        ) ON TABLE public."products" TO anon, authenticated;
        DROP POLICY IF EXISTS "public_read_active_products" ON public."products";
        CREATE POLICY "public_read_active_products"
        ON public."products"
        FOR SELECT
        TO anon, authenticated
        USING ("isDeleted" = false AND "status" IN ('ON_MARKET', 'IN_CLOSET'));
    END IF;

    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'Listing') THEN
        REVOKE ALL ON TABLE public."Listing" FROM PUBLIC, anon, authenticated;
        GRANT SELECT ON TABLE public."Listing" TO anon, authenticated;
        DROP POLICY IF EXISTS "public_read_active_listings" ON public."Listing";
        CREATE POLICY "public_read_active_listings"
        ON public."Listing"
        FOR SELECT
        TO anon, authenticated
        USING ("isDeleted" = false AND "status" <> 'HIDDEN');
    END IF;

    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'ProductImage') THEN
        REVOKE ALL ON TABLE public."ProductImage" FROM PUBLIC, anon, authenticated;
        GRANT SELECT (
            id, "productId", url, width, height, format, "isPrimary", "sortOrder", "createdAt"
        ) ON TABLE public."ProductImage" TO anon, authenticated;
        DROP POLICY IF EXISTS "public_read_product_images" ON public."ProductImage";
        CREATE POLICY "public_read_product_images"
        ON public."ProductImage"
        FOR SELECT
        TO anon, authenticated
        USING (
            EXISTS (
                SELECT 1
                FROM public."products" p
                WHERE p.id = "ProductImage"."productId"
                  AND p."isDeleted" = false
                  AND p."status" IN ('ON_MARKET', 'IN_CLOSET')
            )
        );
    END IF;

    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'Review') THEN
        REVOKE ALL ON TABLE public."Review" FROM PUBLIC, anon, authenticated;
        GRANT SELECT (
            id, "rentalId", "reviewerId", "revieweeId", "productId",
            rating, comment, type, "isPublished", "createdAt", "updatedAt"
        ) ON TABLE public."Review" TO anon, authenticated;
        DROP POLICY IF EXISTS "public_read_published_reviews" ON public."Review";
        CREATE POLICY "public_read_published_reviews"
        ON public."Review"
        FOR SELECT
        TO anon, authenticated
        USING ("isPublished" = true);
    END IF;
END $$;

-- -----------------------------------------------------------------------------
-- BƯỚC 2: KIỂM TRA VÀ VALIDATE RÀNG BUỘC SỐ DƯ (CHẶN NaN, Infinity, -Infinity & SỐ ÂM)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_is_valid_finite_number(val NUMERIC)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
    IF val IS NULL THEN
        RETURN TRUE;
    END IF;
    IF val::TEXT IN ('NaN', 'Infinity', '-Infinity') THEN
        RETURN FALSE;
    END IF;
    RETURN TRUE;
END;
$$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'User') THEN
        ALTER TABLE public."User" DROP CONSTRAINT IF EXISTS chk_user_balances_finite_and_non_negative;
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'User' AND column_name = 'walletBalance'
        ) AND EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'User' AND column_name = 'pendingWithdrawalBalance'
        ) AND EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'User' AND column_name = 'cloopCoins'
        ) THEN
            ALTER TABLE public."User"
            ADD CONSTRAINT chk_user_balances_finite_and_non_negative
            CHECK (
                public.fn_is_valid_finite_number("walletBalance"::NUMERIC)
                AND public.fn_is_valid_finite_number("pendingWithdrawalBalance"::NUMERIC)
                AND public.fn_is_valid_finite_number("cloopCoins"::NUMERIC)
                AND "walletBalance"::NUMERIC >= 0
                AND "pendingWithdrawalBalance"::NUMERIC >= 0
                AND "cloopCoins"::NUMERIC >= 0
            ) NOT VALID;

            -- Xác thực toàn bộ dữ liệu hiện có để convalidated = true
            ALTER TABLE public."User"
            VALIDATE CONSTRAINT chk_user_balances_finite_and_non_negative;
        END IF;
    END IF;
END $$;

-- -----------------------------------------------------------------------------
-- BƯỚC 3: TRIGGER BẢO VỆ BẢNG "User" (SECURITY INVOKER ĐỂ GIỮ ĐÚNG CURRENT_USER)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_guard_user_sensitive_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
    active_role TEXT;
    sess_role TEXT;
    setting_role TEXT;
    jwt_role TEXT;
    is_client_actor BOOLEAN;
BEGIN
    active_role := COALESCE(current_user, '');
    sess_role := COALESCE(session_user, '');
    setting_role := COALESCE(current_setting('role', true), '');
    jwt_role := COALESCE(current_setting('request.jwt.claim.role', true), '');

    is_client_actor := (
        active_role IN ('anon', 'authenticated')
        OR sess_role IN ('anon', 'authenticated')
        OR setting_role IN ('anon', 'authenticated')
        OR jwt_role IN ('anon', 'authenticated')
    );

    -- Chặn NaN / Infinity / số âm trên các cột số dư của User
    IF (NEW."walletBalance" IS NULL) OR (NEW."walletBalance"::TEXT IN ('NaN', 'Infinity', '-Infinity')) OR (NEW."walletBalance" < 0) THEN
        RAISE EXCEPTION 'SECURITY_VIOLATION: Giá trị walletBalance không hợp lệ (NULL, NaN, Infinity hoặc âm).';
    END IF;

    IF (NEW."pendingWithdrawalBalance" IS NULL) OR (NEW."pendingWithdrawalBalance"::TEXT IN ('NaN', 'Infinity', '-Infinity')) OR (NEW."pendingWithdrawalBalance" < 0) THEN
        RAISE EXCEPTION 'SECURITY_VIOLATION: Giá trị pendingWithdrawalBalance không hợp lệ (NULL, NaN, Infinity hoặc âm).';
    END IF;

    IF (NEW."cloopCoins" IS NULL) OR (NEW."cloopCoins"::TEXT IN ('NaN', 'Infinity', '-Infinity')) OR (NEW."cloopCoins" < 0) THEN
        RAISE EXCEPTION 'SECURITY_VIOLATION: Giá trị cloopCoins không hợp lệ (NULL, NaN, Infinity hoặc âm).';
    END IF;

    -- Chặn truy cập từ role anon / authenticated (cho cả INSERT và UPDATE)
    IF is_client_actor THEN
        IF TG_OP = 'INSERT' THEN
            IF NEW."walletBalance" <> 0 OR NEW."pendingWithdrawalBalance" <> 0 OR NEW."cloopCoins" > 100 OR NEW.role::TEXT <> 'USER' OR NEW."isVerified" IS TRUE THEN
                RAISE EXCEPTION 'SECURITY_LOCKDOWN: Không được phép tự khởi tạo số dư ví, xu, quyền admin hoặc trạng thái xác thực từ phía Client.';
            END IF;
        ELSIF TG_OP = 'UPDATE' THEN
            IF NEW."walletBalance" IS DISTINCT FROM OLD."walletBalance" THEN
                RAISE EXCEPTION 'SECURITY_LOCKDOWN: Không được phép cập nhật trực tiếp cột walletBalance từ phía Client.';
            END IF;

            IF NEW."pendingWithdrawalBalance" IS DISTINCT FROM OLD."pendingWithdrawalBalance" THEN
                RAISE EXCEPTION 'SECURITY_LOCKDOWN: Không được phép cập nhật trực tiếp cột pendingWithdrawalBalance từ phía Client.';
            END IF;

            IF NEW."cloopCoins" IS DISTINCT FROM OLD."cloopCoins" THEN
                RAISE EXCEPTION 'SECURITY_LOCKDOWN: Không được phép cập nhật trực tiếp cột cloopCoins từ phía Client.';
            END IF;

            IF NEW.role IS DISTINCT FROM OLD.role THEN
                RAISE EXCEPTION 'SECURITY_LOCKDOWN: Không được phép tự thay đổi quyền (role) của tài khoản.';
            END IF;

            IF NEW."isVerified" IS DISTINCT FROM OLD."isVerified" THEN
                RAISE EXCEPTION 'SECURITY_LOCKDOWN: Không được phép tự thay đổi trạng thái xác thực (isVerified).';
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'User') THEN
        DROP TRIGGER IF EXISTS trg_guard_user_sensitive_columns ON public."User";
        CREATE TRIGGER trg_guard_user_sensitive_columns
        BEFORE INSERT OR UPDATE ON public."User"
        FOR EACH ROW
        EXECUTE FUNCTION public.fn_guard_user_sensitive_columns();
    END IF;
END $$;

-- -----------------------------------------------------------------------------
-- BƯỚC 4: TRIGGER BẢO VỆ BẢNG "Invoice" (BAO PHỦ ĐỦ 5 CỘT TÀI CHÍNH THỰC TẾ:
--         amount, rentalFee, depositAmount, platformFee, shippingFeeCollected)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_guard_invoice_integrity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
    old_status TEXT;
    new_status TEXT;
BEGIN
    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'IMMUTABLE_VIOLATION: Tuyệt đối không được phép xóa bản ghi trong bảng Invoice.';
    END IF;

    IF (NEW.amount IS NULL) OR (NOT public.fn_is_valid_finite_number(NEW.amount::NUMERIC)) OR (NEW.amount <= 0) THEN
        RAISE EXCEPTION 'FINANCE_VIOLATION: Invoice.amount phải là số hữu hạn lớn hơn 0 (nhận giá trị: %).', NEW.amount;
    END IF;

    IF (NEW."rentalFee" IS NULL) OR (NOT public.fn_is_valid_finite_number(NEW."rentalFee"::NUMERIC)) OR (NEW."rentalFee" < 0) THEN
        RAISE EXCEPTION 'FINANCE_VIOLATION: Invoice.rentalFee không được âm hoặc NaN/Infinity.';
    END IF;

    IF (NEW."depositAmount" IS NULL) OR (NOT public.fn_is_valid_finite_number(NEW."depositAmount"::NUMERIC)) OR (NEW."depositAmount" < 0) THEN
        RAISE EXCEPTION 'FINANCE_VIOLATION: Invoice.depositAmount không được âm hoặc NaN/Infinity.';
    END IF;

    IF (NEW."platformFee" IS NULL) OR (NOT public.fn_is_valid_finite_number(NEW."platformFee"::NUMERIC)) OR (NEW."platformFee" < 0) THEN
        RAISE EXCEPTION 'FINANCE_VIOLATION: Invoice.platformFee không được âm hoặc NaN/Infinity.';
    END IF;

    IF (NEW."shippingFeeCollected" IS NULL) OR (NOT public.fn_is_valid_finite_number(NEW."shippingFeeCollected"::NUMERIC)) OR (NEW."shippingFeeCollected" < 0) THEN
        RAISE EXCEPTION 'FINANCE_VIOLATION: Invoice.shippingFeeCollected không được âm hoặc NaN/Infinity.';
    END IF;

    IF TG_OP = 'UPDATE' THEN
        IF NEW.id IS DISTINCT FROM OLD.id OR NEW."rentalId" IS DISTINCT FROM OLD."rentalId" THEN
            RAISE EXCEPTION 'IMMUTABLE_VIOLATION: Không được thay đổi định danh id hoặc rentalId của Invoice.';
        END IF;

        IF NEW.amount IS DISTINCT FROM OLD.amount
           OR NEW."rentalFee" IS DISTINCT FROM OLD."rentalFee"
           OR NEW."depositAmount" IS DISTINCT FROM OLD."depositAmount"
           OR NEW."platformFee" IS DISTINCT FROM OLD."platformFee"
           OR NEW."shippingFeeCollected" IS DISTINCT FROM OLD."shippingFeeCollected"
        THEN
            RAISE EXCEPTION 'IMMUTABLE_VIOLATION: Không được phép sửa đổi các cột số tiền của hóa đơn (amount, rentalFee, depositAmount, platformFee, shippingFeeCollected).';
        END IF;

        old_status := UPPER(COALESCE(OLD.status::TEXT, ''));
        new_status := UPPER(COALESCE(NEW.status::TEXT, ''));

        IF old_status IN ('PAID', 'COMPLETED', 'SETTLED') AND new_status NOT IN ('PAID', 'COMPLETED', 'SETTLED', 'REFUNDED') THEN
            RAISE EXCEPTION 'STATE_VIOLATION: Hóa đơn đã thanh toán (%) không thể chuyển ngược về trạng thái (%).', old_status, new_status;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'Invoice') THEN
        DROP TRIGGER IF EXISTS trg_guard_invoice_integrity ON public."Invoice";
        CREATE TRIGGER trg_guard_invoice_integrity
        BEFORE INSERT OR UPDATE OR DELETE ON public."Invoice"
        FOR EACH ROW
        EXECUTE FUNCTION public.fn_guard_invoice_integrity();
    END IF;
END $$;

-- -----------------------------------------------------------------------------
-- BƯỚC 5: TRIGGER BẢO VỆ BẢNG "coin_topups" (KHỚP CHÍNH XÁC CỘT THỰC TẾ:
--         amountVnd, baseCoins, bonusCoins, totalCoins, userId, packageCode, orderCode)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_guard_coin_topups_integrity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
    old_status TEXT;
    new_status TEXT;
BEGIN
    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'IMMUTABLE_VIOLATION: Không được phép xóa lịch sử nạp xu trong bảng coin_topups.';
    END IF;

    IF (NEW."amountVnd" IS NULL) OR (NOT public.fn_is_valid_finite_number(NEW."amountVnd"::NUMERIC)) OR (NEW."amountVnd" <= 0) THEN
        RAISE EXCEPTION 'FINANCE_VIOLATION: coin_topups.amountVnd phải lớn hơn 0.';
    END IF;

    IF (NEW."baseCoins" IS NULL) OR (NOT public.fn_is_valid_finite_number(NEW."baseCoins"::NUMERIC)) OR (NEW."baseCoins" < 0) THEN
        RAISE EXCEPTION 'FINANCE_VIOLATION: coin_topups.baseCoins không được nhỏ hơn 0.';
    END IF;

    IF (NEW."bonusCoins" IS NULL) OR (NOT public.fn_is_valid_finite_number(NEW."bonusCoins"::NUMERIC)) OR (NEW."bonusCoins" < 0) THEN
        RAISE EXCEPTION 'FINANCE_VIOLATION: coin_topups.bonusCoins không được nhỏ hơn 0.';
    END IF;

    IF (NEW."totalCoins" IS NULL) OR (NOT public.fn_is_valid_finite_number(NEW."totalCoins"::NUMERIC)) OR (NEW."totalCoins" <= 0) THEN
        RAISE EXCEPTION 'FINANCE_VIOLATION: Số xu nạp (coin_topups.totalCoins) phải lớn hơn 0.';
    END IF;

    IF TG_OP = 'UPDATE' THEN
        IF NEW.id IS DISTINCT FROM OLD.id
           OR NEW."userId" IS DISTINCT FROM OLD."userId"
           OR NEW."packageCode" IS DISTINCT FROM OLD."packageCode"
           OR NEW."orderCode" IS DISTINCT FROM OLD."orderCode"
        THEN
            RAISE EXCEPTION 'IMMUTABLE_VIOLATION: Không được phép thay đổi định danh (id, userId, packageCode, orderCode) của giao dịch nạp xu.';
        END IF;

        IF NEW."amountVnd" IS DISTINCT FROM OLD."amountVnd"
           OR NEW."baseCoins" IS DISTINCT FROM OLD."baseCoins"
           OR NEW."bonusCoins" IS DISTINCT FROM OLD."bonusCoins"
           OR NEW."totalCoins" IS DISTINCT FROM OLD."totalCoins"
        THEN
            RAISE EXCEPTION 'IMMUTABLE_VIOLATION: Không được phép sửa số tiền hoặc số lượng xu (amountVnd, baseCoins, bonusCoins, totalCoins) sau khi khởi tạo.';
        END IF;

        old_status := UPPER(COALESCE(OLD.status::TEXT, ''));
        new_status := UPPER(COALESCE(NEW.status::TEXT, ''));

        IF old_status IN ('COMPLETED', 'SUCCESS', 'PAID', 'APPROVED') AND new_status IS DISTINCT FROM old_status THEN
            RAISE EXCEPTION 'STATE_VIOLATION: Giao dịch nạp xu đã hoàn tất (%), tuyệt đối không được cập nhật lại.', old_status;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'coin_topups') THEN
        DROP TRIGGER IF EXISTS trg_guard_coin_topups_integrity ON public."coin_topups";
        CREATE TRIGGER trg_guard_coin_topups_integrity
        BEFORE INSERT OR UPDATE OR DELETE ON public."coin_topups"
        FOR EACH ROW
        EXECUTE FUNCTION public.fn_guard_coin_topups_integrity();
    END IF;
END $$;

-- -----------------------------------------------------------------------------
-- BƯỚC 6A: TRIGGER BẤT BIẾN SỔ CÁI TIỀN "LedgerTransaction" (APPEND-ONLY LEDGER)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_guard_ledger_immutable()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'LEDGER_IMMUTABLE: Sổ cái LedgerTransaction chỉ cho phép ghi thêm (Append-Only), cấm DELETE.';
    END IF;

    IF TG_OP = 'UPDATE' THEN
        RAISE EXCEPTION 'LEDGER_IMMUTABLE: Sổ cái LedgerTransaction là bất biến, cấm UPDATE. Hãy tạo bút toán đảo (Reversal Entry) nếu cần điều chỉnh.';
    END IF;

    IF TG_OP = 'INSERT' THEN
        IF (NEW.amount IS NULL) OR (NOT public.fn_is_valid_finite_number(NEW.amount::NUMERIC)) THEN
            RAISE EXCEPTION 'LEDGER_VIOLATION: LedgerTransaction.amount không được là NULL, NaN hoặc Infinity.';
        END IF;
        IF NEW.amount = 0 THEN
            RAISE EXCEPTION 'LEDGER_VIOLATION: Không cho phép ghi bút toán sổ cái tiền (LedgerTransaction) có số tiền bằng 0.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

-- -----------------------------------------------------------------------------
-- BƯỚC 6B: TRIGGER BẤT BIẾN SỔ CÁI XU "coin_ledger_entries" (APPEND-ONLY COIN LEDGER)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_guard_coin_ledger_immutable()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'LEDGER_IMMUTABLE: Sổ cái xu coin_ledger_entries chỉ cho phép ghi thêm (Append-Only), cấm DELETE.';
    END IF;

    IF TG_OP = 'UPDATE' THEN
        RAISE EXCEPTION 'LEDGER_IMMUTABLE: Sổ cái xu coin_ledger_entries là bất biến, cấm UPDATE.';
    END IF;

    IF TG_OP = 'INSERT' THEN
        IF (NEW.amount IS NULL) OR (NOT public.fn_is_valid_finite_number(NEW.amount::NUMERIC)) THEN
            RAISE EXCEPTION 'LEDGER_VIOLATION: coin_ledger_entries.amount không được là NULL, NaN hoặc Infinity.';
        END IF;
        IF (NEW."balanceAfter" IS NULL) OR (NOT public.fn_is_valid_finite_number(NEW."balanceAfter"::NUMERIC)) OR (NEW."balanceAfter" < 0) THEN
            RAISE EXCEPTION 'LEDGER_VIOLATION: coin_ledger_entries.balanceAfter không được âm, NULL, NaN hoặc Infinity.';
        END IF;
        -- Chỉ cho phép amount = 0 nếu là bút toán ghi nhận đẩy top trực tiếp qua VietQR (có topUpId)
        IF NEW.amount = 0 AND NOT (NEW.type::TEXT = 'BOOST_SPEND' AND NEW."topUpId" IS NOT NULL) THEN
            RAISE EXCEPTION 'LEDGER_VIOLATION: Không cho phép ghi bút toán xu bằng 0 ngoài luồng đối chiếu VietQR Boost.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'LedgerTransaction') THEN
        DROP TRIGGER IF EXISTS trg_guard_ledger_immutable ON public."LedgerTransaction";
        CREATE TRIGGER trg_guard_ledger_immutable
        BEFORE INSERT OR UPDATE OR DELETE ON public."LedgerTransaction"
        FOR EACH ROW
        EXECUTE FUNCTION public.fn_guard_ledger_immutable();
    END IF;

    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'coin_ledger_entries') THEN
        DROP TRIGGER IF EXISTS trg_guard_coin_ledger_immutable ON public."coin_ledger_entries";
        CREATE TRIGGER trg_guard_coin_ledger_immutable
        BEFORE INSERT OR UPDATE OR DELETE ON public."coin_ledger_entries"
        FOR EACH ROW
        EXECUTE FUNCTION public.fn_guard_coin_ledger_immutable();
    END IF;
END $$;

-- -----------------------------------------------------------------------------
-- BƯỚC 6C: TRIGGER BẢO VỆ BẢNG "withdrawal_requests" (CHỐNG SỬA SỐ TIỀN RÚT & XÓA LỊCH SỬ)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_guard_withdrawal_integrity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'IMMUTABLE_VIOLATION: Tuyệt đối không được phép xóa yêu cầu rút tiền trong withdrawal_requests.';
    END IF;

    IF (NEW.amount IS NULL) OR (NOT public.fn_is_valid_finite_number(NEW.amount::NUMERIC)) THEN
        RAISE EXCEPTION 'FINANCE_VIOLATION: withdrawal_requests.amount chứa giá trị NULL, NaN hoặc Infinity.';
    END IF;

    IF NEW.amount < 10000 THEN
        RAISE EXCEPTION 'FINANCE_VIOLATION: withdrawal_requests.amount phải từ 10.000 VNĐ trở lên.';
    END IF;

    IF TG_OP = 'UPDATE' THEN
        IF NEW.amount IS DISTINCT FROM OLD.amount THEN
            RAISE EXCEPTION 'IMMUTABLE_VIOLATION: Không được phép sửa số tiền của lệnh rút tiền đã tạo.';
        END IF;
        IF NEW."userId" IS DISTINCT FROM OLD."userId" THEN
            RAISE EXCEPTION 'IMMUTABLE_VIOLATION: Không được phép đổi chủ sở hữu lệnh rút tiền.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'withdrawal_requests') THEN
        DROP TRIGGER IF EXISTS trg_guard_withdrawal_integrity ON public."withdrawal_requests";
        CREATE TRIGGER trg_guard_withdrawal_integrity
        BEFORE INSERT OR UPDATE OR DELETE ON public."withdrawal_requests"
        FOR EACH ROW
        EXECUTE FUNCTION public.fn_guard_withdrawal_integrity();
    END IF;
END $$;

-- -----------------------------------------------------------------------------
-- BƯỚC 7: TRIGGER BẢO VỆ "rental_history" THEO ĐÚNG CỘT THỰC TẾ
--         (id, product_id, renterId, ownerId, start_date, end_date, status)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_guard_rental_financials()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'IMMUTABLE_VIOLATION: Không được phép xóa bản ghi lịch sử đơn thuê trong rental_history.';
    END IF;

    IF NEW.start_date IS NOT NULL AND NEW.end_date IS NOT NULL AND NEW.end_date < NEW.start_date THEN
        RAISE EXCEPTION 'RENTAL_VIOLATION: Ngày kết thúc thuê (end_date) không được nhỏ hơn ngày bắt đầu (start_date).';
    END IF;

    IF TG_OP = 'UPDATE' THEN
        IF NEW.id IS DISTINCT FROM OLD.id
           OR NEW.product_id IS DISTINCT FROM OLD.product_id
           OR NEW."renterId" IS DISTINCT FROM OLD."renterId"
        THEN
            RAISE EXCEPTION 'IMMUTABLE_VIOLATION: Không được phép thay đổi id, product_id hoặc renterId của đơn thuê.';
        END IF;

        IF OLD."ownerId" IS NOT NULL AND NEW."ownerId" IS DISTINCT FROM OLD."ownerId" THEN
            RAISE EXCEPTION 'IMMUTABLE_VIOLATION: Không được phép thay đổi ownerId của đơn thuê sau khi đã gán.';
        END IF;

        IF OLD.status::TEXT = 'LENDER_COMPLETED' AND NEW.status::TEXT <> 'LENDER_COMPLETED' THEN
            RAISE EXCEPTION 'STATE_VIOLATION: Đơn thuê đã hoàn tất quyết toán (LENDER_COMPLETED), không thể lùi trạng thái về (%).', NEW.status;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'rental_history') THEN
        DROP TRIGGER IF EXISTS trg_guard_rental_history_financials ON public."rental_history";
        CREATE TRIGGER trg_guard_rental_history_financials
        BEFORE INSERT OR UPDATE OR DELETE ON public."rental_history"
        FOR EACH ROW
        EXECUTE FUNCTION public.fn_guard_rental_financials();
    END IF;
END $$;

-- -----------------------------------------------------------------------------
-- BƯỚC 8: TỰ ĐỘNG BẬT RLS CHO BẢNG MỚI BẰNG EVENT TRIGGER (CÓ KHỐI EXCEPTION AN TOÀN)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_auto_enable_rls_on_new_table()
RETURNS event_trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    obj record;
BEGIN
    FOR obj IN SELECT * FROM pg_event_trigger_ddl_commands() WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS')
    LOOP
        IF obj.schema_name = 'public' THEN
            EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY;', obj.object_identity);
            EXECUTE format('ALTER TABLE %s FORCE ROW LEVEL SECURITY;', obj.object_identity);
            EXECUTE format('REVOKE ALL ON TABLE %s FROM PUBLIC, anon, authenticated;', obj.object_identity);
        END IF;
    END LOOP;
END;
$$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_event_trigger WHERE evtname = 'evtrg_auto_enable_rls_on_ddl') THEN
        DROP EVENT TRIGGER evtrg_auto_enable_rls_on_ddl;
    END IF;

    CREATE EVENT TRIGGER evtrg_auto_enable_rls_on_ddl
    ON ddl_command_end
    WHEN TAG IN ('CREATE TABLE', 'CREATE TABLE AS')
    EXECUTE FUNCTION public.fn_auto_enable_rls_on_new_table();

EXCEPTION
    WHEN insufficient_privilege THEN
        RAISE NOTICE 'THÔNG BÁO AN TOÀN: Role hiện tại không có quyền SUPERUSER để tạo EVENT TRIGGER. Bỏ qua bước tạo Event Trigger.';
    WHEN OTHERS THEN
        RAISE NOTICE 'THÔNG BÁO AN TOÀN: Không thể tạo Event Trigger (% - %). Tiếp tục hoàn tất Transaction.', SQLSTATE, SQLERRM;
END $$;

COMMIT;
