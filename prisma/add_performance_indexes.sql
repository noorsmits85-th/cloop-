-- ==============================================================================
-- CLOOP ANTI-CONCURRENCY & PERFORMANCE INDEXES
-- Non-destructive: Uses CREATE INDEX IF NOT EXISTS / CREATE EXTENSION IF NOT EXISTS
-- ZERO data loss: No DROP, No TRUNCATE, No ALTER column types
-- ==============================================================================

-- 1. Kích hoạt extension tìm kiếm mờ (trigram) cho ILIKE search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. Tối ưu tìm kiếm văn bản mờ trên bảng products (title, description, category)
CREATE INDEX IF NOT EXISTS idx_products_title_trgm ON products USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_products_desc_trgm ON products USING gin (description gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_products_category_trgm ON products USING gin (category gin_trgm_ops);

-- 3. Tối ưu lọc sản phẩm đang hiển thị và sắp xếp mới nhất (shop & browse)
CREATE INDEX IF NOT EXISTS idx_products_status_deleted_created ON products (status, "isDeleted", "createdAt" DESC);

-- 4. Tối ưu bảng Listing theo sản phẩm, trạng thái và loại niêm yết (rent/sell)
CREATE INDEX IF NOT EXISTS idx_listing_prod_status_type ON "Listing" ("productId", status, "listingType", "isDeleted");

-- 5. Tối ưu truy vấn đơn hàng / thông báo theo user và thời gian cập nhật
CREATE INDEX IF NOT EXISTS idx_rental_history_renter_updated ON rental_history ("renterId", "updatedAt" DESC);
CREATE INDEX IF NOT EXISTS idx_rental_history_owner_updated ON rental_history ("ownerId", "updatedAt" DESC);
CREATE INDEX IF NOT EXISTS idx_rental_history_status_updated ON rental_history (status, "updatedAt" DESC);

-- 6. Tối ưu truy vấn lịch sử biến động điểm xanh (ESG) và lệnh rút tiền
CREATE INDEX IF NOT EXISTS idx_coin_ledger_user_created ON coin_ledger_entries ("userId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_withdrawal_user_created ON withdrawal_requests ("userId", "createdAt" DESC);

-- 7. Tối ưu truy vấn hóa đơn & trạng thái thanh toán / cọc Escrow
CREATE INDEX IF NOT EXISTS idx_invoice_rental_status ON "Invoice" ("rentalId", status);
