# Shipping Phase 1: Operational Runbook

## 1. Mục Đích
Tài liệu này lưu trữ trạng thái của việc triển khai luồng Giao Hàng Pha 1 (Admin-Assisted Booking) lên môi trường Production.
Vì luồng này tác động trực tiếp đến dòng tiền (Invoice/Money Flow) và Database, các biện pháp an toàn và kiểm tra đã được thực thi.

## 2. Trạng Thái Cập Nhật Database (Migration Record)

- **Target Database**: Supabase Production (`aws-1-ap-southeast-1.pooler.supabase.com:6543`)
- **SQL File Đã Apply**: `prisma/migrations/add_shipment.sql`
- **Thời gian Apply**: `2026-08-18 00:21:05 (UTC+7)`
- **Commit Đang Deploy**: `8802b4f` (fix P2002 duplicate code error) & `31383d7` (Phase 1 Code)
- **Output Apply Thành Công**:
  ```text
  warn The configuration property `package.json#prisma` is deprecated and will be removed in Prisma 7.
  Loaded Prisma config from prisma.config.ts.
  Script executed successfully.
  ```

> [!WARNING]
> Bản SQL `add_shipment.sql` đã được chạy theo phương thức **one-shot production applied** sử dụng lệnh `npx prisma db execute`. 
> Lệnh này đã trực tiếp cập nhật CSDL thật. Lần sau tuyệt đối xác nhận môi trường `.env` trước khi thực thi `db execute`, `db push` hoặc `migrate`.

## 3. Các Script Công Cụ (Ops Scripts)

### `scripts/verify_shipping_schema.ts`
Script này sử dụng Prisma raw query trực tiếp vào bảng hệ thống PostgreSQL (`information_schema` và `pg_class`) để xác minh sự tồn tại của Schema. Nó CHỈ ĐỌC dữ liệu.

**Kết quả xác minh (2026-08-18 00:43):**
- Table `shipments`: ✅
- Enum `OWNER_PACKED` (trong `RentalStatus`): ✅
- Unique Constraint `shipments_rentalId_direction_key`: ✅
- Unique Constraint `shipments_provider_providerOrderCode_key`: ✅
- Check Constraint tiền không âm (`shippingFeeCollected`): ✅
- Foreign Key (`shipments_rentalId_fkey`): ✅

### `scripts/cleanup_test_data.ts`
Script dùng để dọn dẹp các dữ liệu test sinh ra từ kịch bản E2E. Nó sẽ tìm và xóa triệt để các User có ID bắt đầu bằng `test-`, kèm theo toàn bộ `Product`, `RentalHistory`, `Invoice`, `Shipment`, và `AuditLog` liên quan.

*Lưu ý: Script `test_e2e.ts` trong lần thử nghiệm trước đã bị chặn ngay từ vòng Compile của TypeScript nên chưa từng đẩy Mock Data rác lên DB.*

## 4. Flow Dòng Chảy Trạng Thái (State Machine)

1. **Renter thanh toán (PayOS)** ➔ Webhook trả về thành công ➔ RentalHistory nhảy sang `PENDING_APPROVAL` (Chờ chủ đồ xác nhận).
2. **Owner đóng gói xong** ➔ Bấm nút "Đã đóng gói - Gọi Shipper" (UI) ➔ Hệ thống tạo Shipment ở `PENDING_BOOKING`, RentalHistory nhảy sang `OWNER_PACKED`.
3. **Admin điều phối Shipper** ➔ Admin nhập tay mã vận đơn (GHN) vào Dashboard ➔ Shipment nhảy sang `BOOKED`, RentalHistory nhảy sang `LENDER_SHIPPED`.
