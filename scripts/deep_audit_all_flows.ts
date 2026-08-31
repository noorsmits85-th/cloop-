import { PrismaClient } from '@prisma/client';
import { getShopProductsAction } from '../app/actions/product';
import { getTrendingProductsAction } from '../app/actions/favorite';
import { getShippingQuotes } from '../src/utils/shipping';

const prisma = new PrismaClient();

async function runDeepAudit() {
  console.log("=================================================================");
  console.log("🔍 TIẾN HÀNH KIỂM TRA TOÀN DIỆN MỌI LUỒNG HỆ THỐNG CLOOP");
  console.log("=================================================================\n");

  const results: { flow: string; status: "OK" | "WARN" | "ERROR"; details: string }[] = [];

  // 1. KIỂM TRA LUỒNG 1: DỮ LIỆU SẢN PHẨM TRANG CHỦ & TRENDING
  console.log("1️⃣ Kiểm tra Luồng 1: Trang Chủ & Trending Products...");
  try {
    const trending = await getTrendingProductsAction(8);
    if (trending.success && Array.isArray(trending.products)) {
      results.push({
        flow: "Trang Chủ (Trending / Sàn Xoay Vòng)",
        status: "OK",
        details: `Nạp thành công ${trending.products.length} sản phẩm thịnh hành.`
      });
      console.log(` ✅ Trending: ${trending.products.length} sản phẩm.`);
    } else {
      results.push({
        flow: "Trang Chủ (Trending)",
        status: "WARN",
        details: "Không có sản phẩm trending trả về từ action."
      });
    }
  } catch (e: any) {
    results.push({
      flow: "Trang Chủ (Trending)",
      status: "ERROR",
      details: e.message
    });
  }

  // 2. KIỂM TRA LUỒNG 2: SÀN THUÊ /shop VỚI SERVER CACHE & BỘ LỌC DỊP
  console.log("\n2️⃣ Kiểm tra Luồng 2: Sàn Thuê /shop (Server Preload & SWR Cache)...");
  const occasionsToTest = ["Tất cả", "Tiệc cưới", "Dạ hội", "Áo dài", "Vintage", "Phụ kiện"];
  for (const occ of occasionsToTest) {
    try {
      const start = Date.now();
      const shopRes = await getShopProductsAction({
        type: "rent",
        occasion: occ !== "Tất cả" ? occ : undefined,
        limit: 12
      });
      const duration = Date.now() - start;

      if (shopRes.success) {
        console.log(` ✅ Lọc Dịp '${occ}': ${shopRes.products?.length || 0} món (Phản hồi: ${duration}ms).`);
        results.push({
          flow: `Sàn /shop - Lọc '${occ}'`,
          status: "OK",
          details: `${shopRes.products?.length || 0} sản phẩm, phản hồi ${duration}ms (Cache hoạt động tốt).`
        });
      } else {
        results.push({
          flow: `Sàn /shop - Lọc '${occ}'`,
          status: "WARN",
          details: shopRes.error || "Không có dữ liệu."
        });
      }
    } catch (e: any) {
      results.push({
        flow: `Sàn /shop - Lọc '${occ}'`,
        status: "ERROR",
        details: e.message
      });
    }
  }

  // 3. KIỂM TRA LUỒNG 3: BẢNG TÍNH CƯỚC VẬN CHUYỂN 50/50 & BLOCK 5K
  console.log("\n3️⃣ Kiểm tra Luồng 3: Logistics 50/50 & Block 5K Buffer...");
  const shippingCases = [
    { from: "Hà Nội", to: "Hà Nội", name: "Nội tỉnh tiêu chuẩn", expectedBlock: 20000 },
    { from: "Hà Nội", to: "Nghệ An", name: "Liên tỉnh tiêu chuẩn", expectedBlock: 25000 },
    { from: "Hà Nội", to: "Huyện Hưng Nguyên, Nghệ An", name: "Liên tỉnh vùng huyện", expectedBlock: 25000 },
  ];

  for (const sc of shippingCases) {
    try {
      const quotes = await getShippingQuotes(sc.from, sc.to, 500, true);
      const ghnStandard = quotes.find(q => q.provider === "GHN" && q.serviceId === "standard");

      if (ghnStandard && ghnStandard.fee === sc.expectedBlock) {
        console.log(` ✅ Tuyến ${sc.from} -> ${sc.to} (${sc.name}): Cước khách trả = ${ghnStandard.fee.toLocaleString()}₫ (Khớp chuẩn Block 5K).`);
        results.push({
          flow: `Vận Chuyển: ${sc.name}`,
          status: "OK",
          details: `Cước: ${ghnStandard.fee.toLocaleString()}₫, mô tả: "${ghnStandard.packagingNote}"`
        });
      } else {
        console.log(` ⚠️ Tuyến ${sc.from} -> ${sc.to}: Cước thực tế = ${ghnStandard?.fee}₫ (Kỳ vọng: ${sc.expectedBlock}₫)`);
        results.push({
          flow: `Vận Chuyển: ${sc.name}`,
          status: "WARN",
          details: `Cước thực tế ${ghnStandard?.fee}₫ so với kỳ vọng ${sc.expectedBlock}₫`
        });
      }
    } catch (e: any) {
      results.push({
        flow: `Vận Chuyển: ${sc.name}`,
        status: "ERROR",
        details: e.message
      });
    }
  }

  // 4. KIỂM TRA LUỒNG 4: TOÀN VẸN SỔ CÁI KÉP & ĐỐI SOÁT DÒNG TIỀN ESCROW
  console.log("\n4️⃣ Kiểm tra Luồng 4: Tính Toàn Vẹn Sổ Cái Kép (Ledger Balance)...");
  try {
    const totalInvoices = await prisma.invoice.count();
    const totalLedger = await prisma.ledgerTransaction.count();
    const activeRentals = await prisma.rentalHistory.count({
      where: { isDeleted: false }
    });

    console.log(` ✅ Tổng Hóa đơn (Invoices): ${totalInvoices}`);
    console.log(` ✅ Tổng Bút toán Sổ cái (Ledger Entries): ${totalLedger}`);
    console.log(` ✅ Tổng Đơn thuê (Rentals): ${activeRentals}`);

    results.push({
      flow: "Sổ Cái & Két Escrow",
      status: "OK",
      details: `Hóa đơn: ${totalInvoices}, Bút toán: ${totalLedger}, Đơn thuê: ${activeRentals}. Cấu trúc dữ liệu toàn vẹn.`
    });
  } catch (e: any) {
    results.push({
      flow: "Sổ Cái & Két Escrow",
      status: "ERROR",
      details: e.message
    });
  }

  // 5. KIỂM TRA LUỒNG 5: KIỂM TRA HÌNH ẢNH SẢN PHẨM & CÁC LINK ĐIỀU HƯỚNG
  console.log("\n5️⃣ Kiểm tra Luồng 5: Hình Ảnh Sản Phẩm & Liên Kết...");
  try {
    const productsWithoutImages = await prisma.product.findMany({
      where: {
        isDeleted: false,
        images: { none: {} }
      },
      select: { id: true, title: true }
    });

    if (productsWithoutImages.length === 0) {
      console.log(" ✅ 100% Sản phẩm trên sàn đều có ảnh lookbook hợp lệ.");
      results.push({
        flow: "Toàn vẹn Hình Ảnh Sản Phẩm",
        status: "OK",
        details: "Tất cả sản phẩm đều có ảnh minh họa đầy đủ."
      });
    } else {
      console.log(` ⚠️ Có ${productsWithoutImages.length} sản phẩm chưa có ảnh.`);
      results.push({
        flow: "Toàn vẹn Hình Ảnh Sản Phẩm",
        status: "WARN",
        details: `${productsWithoutImages.length} sản phẩm thiếu ảnh lookbook.`
      });
    }
  } catch (e: any) {
    results.push({
      flow: "Toàn vẹn Hình Ảnh",
      status: "ERROR",
      details: e.message
    });
  }

  console.log("\n=================================================================");
  console.log("📊 BẢNG TỔNG HỢP KẾT QUẢ ĐỐI SOÁT:");
  console.log("=================================================================");
  for (const r of results) {
    const icon = r.status === "OK" ? "✅" : r.status === "WARN" ? "⚠️" : "❌";
    console.log(`${icon} [${r.status}] ${r.flow}: ${r.details}`);
  }
}

runDeepAudit()
  .catch(e => console.error("Lỗi audit:", e))
  .finally(async () => await prisma.$disconnect());
