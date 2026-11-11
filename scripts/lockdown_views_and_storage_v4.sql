-- =============================================================================
-- FILE: scripts/lockdown_views_and_storage_v4.sql
-- Hãy chạy thử script này ở môi trường Local trước khi đẩy lên Staging/Production
-- MỤC ĐÍCH:
--   1. Khóa chặt 2 compatibility views (public.blog_posts, public.product_images):
--      bật security_invoker = true, security_barrier = true, thu hồi toàn bộ quyền
--      INSERT/UPDATE/DELETE/TRUNCATE của PUBLIC, anon, authenticated, và giới hạn
--      chỉ hiển thị bản ghi công khai hợp lệ.
--   2. Thu hẹp quyền SELECT trên bảng public."Listing" (loại bỏ cột snapshot khỏi
--      anon/authenticated) và bắt buộc đối chiếu sản phẩm cha còn hoạt động.
--   3. Khóa chặt Supabase Storage (storage.buckets & storage.objects):
--      - Xóa các policy PUBLIC cho phép anon INSERT/UPDATE/DELETE trên bucket products.
--      - Cấu hình giới hạn dung lượng (10MB) và MIME allowlist cho bucket products & cloop-media.
--      - Khởi tạo bucket cloop-media (public read cho ảnh sản phẩm) và cloop-disputes-private
--        (private 100% cho bằng chứng khiếu nại).
--      - Chỉ cho phép SELECT công khai trên bucket ảnh catalog ('products', 'cloop-media');
--        mọi thao tác ghi/xóa phải đi qua Backend Service Role đã xác thực.
--   4. Thu hồi quyền EXECUTE trực tiếp của PUBLIC, anon, authenticated trên các hàm nội bộ.
--   Tuyệt đối KHÔNG chứa lệnh DROP TABLE, TRUNCATE hay xóa dữ liệu hiện có.
-- =============================================================================

BEGIN;

-- 1. KHÓA CHẶT CÁC COMPATIBILITY VIEWS TRONG SCHEMA PUBLIC
DO $$
DECLARE
    v RECORD;
BEGIN
    FOR v IN
        SELECT viewname
        FROM pg_views
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC, anon, authenticated;', v.viewname);
    END LOOP;
END $$;

-- Cấu hình lại view public.blog_posts: bật security_invoker + chỉ lọc bài PUBLIC/PUBLISHED chưa xóa
CREATE OR REPLACE VIEW public.blog_posts
WITH (security_invoker = true, security_barrier = true)
AS
SELECT
    id,
    title,
    content,
    cover_image,
    "productId",
    "userId",
    status,
    "isPinned",
    "createdAt",
    "updatedAt",
    "isDeleted"
FROM public."BlogPost"
WHERE "isDeleted" = false AND status IN ('PUBLIC', 'PUBLISHED');

REVOKE ALL ON TABLE public.blog_posts FROM PUBLIC, anon, authenticated;

-- Cho phép đọc bài blog đã xuất bản (PUBLIC/PUBLISHED & không xóa) qua RLS trên BlogPost nếu cần
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'BlogPost') THEN
        REVOKE ALL ON TABLE public."BlogPost" FROM PUBLIC, anon, authenticated;
        GRANT SELECT (
            id, title, content, cover_image, "productId", "userId",
            status, "isPinned", "createdAt", "updatedAt", "isDeleted"
        ) ON TABLE public."BlogPost" TO anon, authenticated;

        DROP POLICY IF EXISTS "public_read_published_blogs" ON public."BlogPost";
        CREATE POLICY "public_read_published_blogs"
        ON public."BlogPost"
        FOR SELECT
        TO anon, authenticated
        USING ("isDeleted" = false AND status IN ('PUBLIC', 'PUBLISHED'));
    END IF;
END $$;

GRANT SELECT (
    id, title, content, cover_image, "productId", "userId",
    status, "isPinned", "createdAt", "updatedAt", "isDeleted"
) ON TABLE public.blog_posts TO anon, authenticated;

-- Cấu hình lại view public.product_images: bật security_invoker + ẩn metadata nội bộ + kiểm tra sản phẩm cha
CREATE OR REPLACE VIEW public.product_images
WITH (security_invoker = true, security_barrier = true)
AS
SELECT
    pi.id,
    pi."productId",
    pi.url,
    NULL::text AS "storageProvider",
    NULL::text AS "publicId",
    pi.width,
    pi.height,
    NULL::integer AS bytes,
    pi.format,
    pi."isPrimary",
    pi."sortOrder",
    pi."createdAt"
FROM public."ProductImage" pi
WHERE EXISTS (
    SELECT 1
    FROM public."products" p
    WHERE p.id = pi."productId"
      AND p."isDeleted" = false
      AND p."status" IN ('ON_MARKET', 'IN_CLOSET')
);

REVOKE ALL ON TABLE public.product_images FROM PUBLIC, anon, authenticated;
GRANT SELECT (
    id, "productId", url, width, height, format, "isPrimary", "sortOrder", "createdAt"
) ON TABLE public.product_images TO anon, authenticated;

-- 2. THU HẸP QUYỀN CỘT & RLS POLICY TRÊN BẢNG public."Listing" (ẨN CỘT snapshot & RÀNG BUỘC SẢN PHẨM CHA)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'Listing') THEN
        REVOKE ALL ON TABLE public."Listing" FROM PUBLIC, anon, authenticated;
        GRANT SELECT (
            id, "productId", "listingType", "basePrice", "salePrice", deposit,
            "minDays", "pricing_tiers", "turnaround_days", "greenPoints",
            status, "isDeleted", "createdAt", "updatedAt"
        ) ON TABLE public."Listing" TO anon, authenticated;

        DROP POLICY IF EXISTS "public_read_active_listings" ON public."Listing";
        CREATE POLICY "public_read_active_listings"
        ON public."Listing"
        FOR SELECT
        TO anon, authenticated
        USING (
            "isDeleted" = false
            AND "status" <> 'HIDDEN'
            AND EXISTS (
                SELECT 1
                FROM public."products" p
                WHERE p.id = "Listing"."productId"
                  AND p."isDeleted" = false
                  AND p."status" IN ('ON_MARKET', 'IN_CLOSET')
            )
        );
    END IF;
END $$;

-- 3. THU HỒI QUYỀN EXECUTE CỦA ANON/AUTHENTICATED TRÊN CÁC HÀM NỘI BỘ / TRIGGER TRONG PUBLIC
DO $$
DECLARE
    fn RECORD;
BEGIN
    FOR fn IN
        SELECT p.oid::regprocedure AS fn_sig
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.proname LIKE 'fn_%'
    LOOP
        EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated;', fn.fn_sig);
    END LOOP;
END $$;

-- 4. KHÓA CHẶT SUPABASE STORAGE BUCKETS & POLICIES (KHÔNG XÓA DỮ LIỆU HIỆN CÓ)
-- 4a. Cập nhật giới hạn dung lượng (10MB) và MIME allowlist cho bucket 'products'
UPDATE storage.buckets
SET
    public = true,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
WHERE id = 'products';

-- 4b. Đảm bảo bucket 'cloop-media' tồn tại (chỉ dùng cho ảnh công khai đã qua kiểm duyệt server)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'cloop-media',
    'cloop-media',
    true,
    10485760,
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE
SET
    public = true,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

-- 4c. Đảm bảo bucket 'cloop-disputes-private' tồn tại (100% PRIVATE cho bằng chứng khiếu nại dự phòng)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'cloop-disputes-private',
    'cloop-disputes-private',
    false,
    104857600,
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime']
)
ON CONFLICT (id) DO UPDATE
SET
    public = false,
    file_size_limit = 104857600,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime'];

-- 4d. Xóa toàn bộ các policy mở quyền ghi/xóa công khai trên storage.objects
DROP POLICY IF EXISTS "Give anon users access to JPG images in folder 1ifhysk_0" ON storage.objects;
DROP POLICY IF EXISTS "Give anon users access to JPG images in folder 1ifhysk_1" ON storage.objects;
DROP POLICY IF EXISTS "Give anon users access to JPG images in folder 1ifhysk_2" ON storage.objects;
DROP POLICY IF EXISTS "Give anon users access to JPG images in folder 1ifhysk_3" ON storage.objects;
DROP POLICY IF EXISTS "public_read_catalog_images_only" ON storage.objects;

-- Chỉ cho phép đọc (SELECT) đối với các bucket ảnh công khai ('products', 'cloop-media')
-- Mọi thao tác INSERT / UPDATE / DELETE từ client (anon/authenticated) bị từ chối hoàn toàn.
CREATE POLICY "public_read_catalog_images_only"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (bucket_id IN ('products', 'cloop-media'));

-- Thu hồi quyền INSERT / UPDATE / DELETE trực tiếp của anon và authenticated trên storage.objects & storage.buckets
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE storage.objects FROM PUBLIC, anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE storage.buckets FROM PUBLIC, anon, authenticated;

COMMIT;
