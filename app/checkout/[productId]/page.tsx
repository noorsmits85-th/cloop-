import { PrismaClient } from "@prisma/client";
import { notFound } from "next/navigation";
import CheckoutClient from "./CheckoutClient";

const prisma = new PrismaClient();

export default async function CheckoutPage({ params }: { params: Promise<{ productId: string }> }) {
  const { productId } = await params;

  // 1. Fetch Product Data
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      images: {
        where: { isPrimary: true },
        take: 1
      },
      user: {
        select: { id: true, name: true } // Thông tin người bán
      },
      listings: {
        where: { status: "AVAILABLE" },
        take: 1
      }
    }
  });

  if (!product || product.listings.length === 0) {
    return notFound();
  }

  const listing = product.listings[0];
  
  // Tạm thời fix cứng cân nặng 500g, sau này có thể thêm field vào schema
  const weight = 500; 
  const fromProvince = product.province; // Điểm lấy hàng

  // Tính toán Tiers
  let pricingTiers = listing.pricing_tiers as any[];
  if (!pricingTiers || pricingTiers.length === 0) {
    // Tự động generate nếu DB cũ chưa có
    const base = listing.basePrice || 0;
    const roundToThousand = (num: number) => Math.round(num / 1000) * 1000;
    pricingTiers = [
      { days: 1, price: base, name: "Gói Hỏa Tốc", description: "Dành cho nhu cầu sử dụng ngay lập tức." },
      { days: 3, price: roundToThousand(base * 3 * 0.85), name: "Gói Cuối Tuần / Đi Tiệc", description: "Thong thả nhận, mặc tiệc, giặt giũ và trả đồ." },
      { days: 7, price: roundToThousand(base * 7 * 0.70), name: "Gói Nghỉ Dưỡng", description: "Hoàn hảo cho những chuyến du lịch xa." },
    ];
  }

  return (
    <div className="min-h-screen bg-[#FAF9F6] py-12 px-4 md:px-8">
      <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Left: Thông tin sản phẩm */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-stone-100 h-fit">
          <h2 className="font-heading text-2xl text-[#0A2517] font-bold mb-6">Thông tin đơn hàng</h2>
          
          <div className="flex gap-4 mb-6 pb-6 border-b border-stone-100">
            {product.images[0]?.url ? (
              <img src={product.images[0].url} alt={product.title} className="w-24 h-32 object-cover rounded" />
            ) : (
              <div className="w-24 h-32 bg-stone-200 rounded animate-pulse" />
            )}
            
            <div className="flex flex-col justify-between">
              <div>
                <h3 className="font-ui font-semibold text-lg text-[#0A2517]">{product.title}</h3>
                <p className="text-sm text-stone-500 mt-1">Người bán: {product.user?.name || "Người dùng CLOOP"}</p>
                <p className="text-sm text-stone-500">Giao từ: {product.province}</p>
              </div>
              <div className="font-ui font-bold text-[#0A2517]">
                {listing.salePrice ? (
                  <>
                    <span className="text-lg">{listing.salePrice.toLocaleString('vi-VN')}đ</span>
                    {listing.basePrice && <span className="text-sm line-through text-stone-400 ml-2">{listing.basePrice.toLocaleString('vi-VN')}đ</span>}
                  </>
                ) : (
                  <span className="text-lg">{(listing.basePrice || 0).toLocaleString('vi-VN')}đ</span>
                )}
              </div>
            </div>
          </div>
          
          {/* Summary */}
          <div className="space-y-3 font-ui text-stone-600">
            <div className="flex justify-between">
              <span>Tạm tính</span>
              <span className="font-semibold text-[#0A2517]">{(listing.salePrice || listing.basePrice || 0).toLocaleString('vi-VN')}đ</span>
            </div>
            {listing.deposit && (
              <div className="flex justify-between">
                <span>Phí cọc (hoàn trả)</span>
                <span className="font-semibold text-[#0A2517]">{listing.deposit.toLocaleString('vi-VN')}đ</span>
              </div>
            )}
          </div>
        </div>

        {/* Right: Form nhập địa chỉ & Thanh toán (Client Component) */}
        <CheckoutClient 
          productId={product.id} 
          fromProvince={fromProvince} 
          weight={weight} 
          depositPrice={listing.deposit || 0}
          pricingTiers={pricingTiers}
          turnaroundDays={listing.turnaround_days || 2}
        />

      </div>
    </div>
  );
}
