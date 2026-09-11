import { Suspense } from "react";
import { getShopProductsAction } from "@/app/actions/product";
import { ShopClient } from "./ShopClient";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

async function ShopContentAsync({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;
  const type = (resolvedParams.type as string) || "all";
  const category = (resolvedParams.category as string) || null;
  const occasion = (resolvedParams.occasion as string) || null;
  const size = (resolvedParams.size as string) || "all";
  const material = (resolvedParams.material as string) || "all";
  const search = (resolvedParams.search as string) || "";

  // ⚡ SERVER-FIRST PRELOAD: Fetch cached products directly on the server (<10ms)
  const initialRes = await getShopProductsAction({
    type,
    category,
    occasion: occasion && occasion !== "Tất cả" ? occasion : undefined,
    search: search.trim() || undefined,
    size: size !== "all" ? size : undefined,
    material: material !== "all" ? material : undefined,
    page: 1,
    limit: 24,
  });

  const initialProducts = initialRes.success && initialRes.products ? initialRes.products : [];
  const initialTotalCount = initialRes.totalCount || 0;
  const initialHasMore = Boolean(initialRes.hasMore);

  return (
    <ShopClient
      initialProducts={initialProducts as any}
      initialTotalCount={initialTotalCount}
      initialHasMore={initialHasMore}
      initialType={type}
      initialOccasion={occasion || category || "Tất cả"}
      initialSize={size}
      initialMaterial={material}
      initialSearch={search}
    />
  );
}

function ShopSkeleton() {
  const occasionList = [
    "Tất cả", "Tiệc cưới", "Dạ hội", "Dạo phố", "Áo dài", "Đi biển", 
    "Kỷ yếu", "Lễ hội", "Công sở", "Upcycle", "Vintage", "Phụ kiện"
  ];

  return (
    <main className="min-h-screen bg-[#FAF8F3] text-[#183A2D] antialiased p-4 sm:p-6 md:p-10 font-sans selection:bg-[#183A2D] selection:text-white">
      <div className="max-w-[1400px] mx-auto space-y-6 sm:space-y-8">
        {/* Header Navigation */}
        <div className="flex justify-between items-center">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-stone-400">
            ← QUAY LẠI TRANG CHỦ
          </span>
          <div className="flex items-center gap-2">
            <span className="bg-white border border-stone-200/80 text-[9px] font-bold uppercase tracking-wider px-3 py-1 rounded-full text-stone-600 shadow-2xs">
              CLOOP MARKETPLACE LIVE
            </span>
          </div>
        </div>

        {/* Title */}
        <div className="text-left space-y-1.5">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-[#183A2D] font-heading">
            Kho Trang Phục Tuần Hoàn
          </h1>
          <p className="text-xs sm:text-[13px] font-medium text-stone-500 max-w-[800px] leading-relaxed">
            Kéo dài vòng đời trang phục, nâng niu phong cách và trải nghiệm hàng ngàn mẫu thiết kế với giá cực hời.
          </p>
        </div>

        {/* TOOLBAR ĐIỀU KHIỂN: CHIPS & SEARCH */}
        <div className="flex flex-col lg:flex-row gap-3 sm:gap-4 justify-between items-start lg:items-center bg-white p-3 sm:p-4 rounded-2xl sm:rounded-3xl border border-stone-200/80 shadow-2xs">
          {/* HORIZONTAL CHIP SCROLLER */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 lg:pb-0 scroll-smooth w-full lg:flex-1">
            {occasionList.map((occ, idx) => (
              <span
                key={occ}
                className={`px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs font-bold whitespace-nowrap select-none font-ui ${
                  idx === 0 
                    ? "bg-[#183A2D] text-white shadow-xs" 
                    : "bg-stone-50 text-stone-600 border border-stone-200/80"
                }`}
              >
                {occ}
              </span>
            ))}
          </div>

          {/* SEARCH & FILTERS */}
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 w-full lg:w-auto font-ui">
            <div className="flex items-center gap-2 border border-stone-200 bg-stone-50 rounded-full px-3.5 py-1.5 sm:py-2 w-full sm:w-[260px]">
              <span className="text-stone-400 text-xs">🔍</span>
              <span className="text-xs text-stone-400 font-medium">Tìm tên váy, áo hoặc chủ tủ...</span>
            </div>
            <span className="flex items-center gap-1.5 border border-[#183A2D] px-4 py-2 rounded-full text-xs font-bold bg-[#183A2D] text-white shadow-2xs">
              <span>Bộ lọc</span>
            </span>
          </div>
        </div>

        {/* LƯỚI SKELETON 8 THẺ TRANG PHỤC */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8 pt-2">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
            <div key={n} className="border border-stone-200/80 bg-white rounded-3xl overflow-hidden flex flex-col h-full animate-pulse shadow-xs">
              <div className="w-full aspect-[3/4] bg-stone-200/70 relative">
                <div className="absolute top-3.5 left-3.5 w-16 h-5 bg-stone-300/80 rounded-md"></div>
                <div className="absolute top-3.5 right-3.5 w-14 h-5 bg-stone-300/80 rounded-md"></div>
              </div>
              <div className="p-4 sm:p-5 flex flex-col justify-between space-y-3">
                <div className="space-y-2">
                  <div className="w-1/3 h-3 bg-stone-200 rounded"></div>
                  <div className="w-3/4 h-4 bg-stone-300/80 rounded"></div>
                </div>
                <div className="flex justify-between items-end mt-2 pt-2 border-t border-stone-100">
                  <div className="w-24 h-5 bg-stone-300/80 rounded"></div>
                  <div className="w-12 h-3 bg-stone-200 rounded"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

export default function ShopPage(props: PageProps) {
  return (
    <Suspense fallback={<ShopSkeleton />}>
      <ShopContentAsync {...props} />
    </Suspense>
  );
}
