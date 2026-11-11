-- =============================================================================
-- FILE: scripts/lockdown_all_tables_v3.sql
-- Hãy chạy thử script này ở môi trường Local trước khi đẩy lên Staging/Production
-- MỤC ĐÍCH: Khóa RLS, thu hồi quyền PostgREST trực tiếp và xóa các policy dư thừa
--           trên toàn bộ các bảng trong schema public của CLOOP.
--           Tuyệt đối KHÔNG chứa lệnh DROP TABLE hay TRUNCATE.
-- =============================================================================

BEGIN;

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

    FOR pol IN
        SELECT tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename NOT IN ('products', 'Listing', 'ProductImage', 'Review')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', pol.policyname, pol.tablename);
    END LOOP;
END $$;

ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM PUBLIC, anon, authenticated;

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

COMMIT;
