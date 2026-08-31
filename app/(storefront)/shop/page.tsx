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

export default function ShopPage(props: PageProps) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FAF8F3] flex flex-col items-center justify-center gap-3 p-6">
          <div className="w-8 h-8 border-3 border-[#183A2D] border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs font-bold uppercase tracking-widest text-stone-500 font-ui">
            Đang mở kho thời trang CLOOP...
          </span>
        </div>
      }
    >
      <ShopContentAsync {...props} />
    </Suspense>
  );
}
