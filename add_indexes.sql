-- Cấu trúc chỉ mục (B-Tree Index) tối ưu hóa truy vấn tìm kiếm và phân trang
-- Dành cho hệ thống PostgreSQL (Supabase) của CLOOP

-- 1. Index cho trường 'createdAt' để hỗ trợ Cursor-based Pagination 
-- (Cực kỳ quan trọng vì ta dùng `.lt('createdAt', cursor)` và `.order('createdAt')`)
CREATE INDEX IF NOT EXISTS "idx_products_created_at" ON "products"("createdAt" DESC);

-- 2. Index cho trường 'size' để lọc đồ đạc siêu tốc
CREATE INDEX IF NOT EXISTS "idx_products_size" ON "products"("size");

-- 3. Index cho trường 'occasion' vì sử dụng `.ilike('%...%')` 
CREATE INDEX IF NOT EXISTS "idx_products_occasion" ON "products"("occasion");

-- 4. Index cho text search trên 'title' (Hỗ trợ tốt hơn cho việc tìm kiếm .ilike)
CREATE INDEX IF NOT EXISTS "idx_products_title" ON "products"("title");

-- 5. Index cho 'material' (Chuẩn bị cho tương lai nếu mở rộng bộ lọc)
CREATE INDEX IF NOT EXISTS "idx_products_material" ON "products"("material");
