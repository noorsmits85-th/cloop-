-- Cấu trúc chỉ mục tối ưu hóa truy vấn tìm kiếm và phân trang
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 1. Index cho trường 'createdAt' để hỗ trợ Cursor-based Pagination 
CREATE INDEX IF NOT EXISTS "products_createdAt_idx" ON "products"("createdAt" DESC);

-- 2. Index cho trường 'size' để lọc đồ đạc siêu tốc
CREATE INDEX IF NOT EXISTS "idx_products_size" ON "products"("size");

-- 3. Index cho trường 'occasion' 
CREATE INDEX IF NOT EXISTS "idx_products_occasion" ON "products"("occasion");

-- 4. GIN Index cho text search trên 'title' (Hỗ trợ tốt cho .ilike)
CREATE INDEX IF NOT EXISTS "idx_products_title" ON "products" USING GIN ("title" gin_trgm_ops);

-- 5. Index cho 'material'
CREATE INDEX IF NOT EXISTS "idx_products_material" ON "products"("material");
