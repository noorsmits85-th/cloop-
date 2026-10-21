import { getShopProductsAction } from "@/app/actions/product";
import { getMyClosetMobileDataAction } from "@/app/actions/closet";
import MobileAppClient from "./MobileAppClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "CLOOP - Ứng Dụng Thời Trang",
  description: "Trải nghiệm ứng dụng thời trang CLOOP",
};

export default async function MobileAppPage() {
  let initialProducts: any[] = [];
  let initialTotalCount = 0;
  let initialUserData: any = null;

  try {
    const [shopResult, closetResult] = await Promise.allSettled([
      getShopProductsAction({
        type: "all",
        page: 1,
        limit: 30,
      }),
      getMyClosetMobileDataAction(),
    ]);

    if (shopResult.status === "fulfilled" && shopResult.value?.success && Array.isArray(shopResult.value.products)) {
      initialProducts = shopResult.value.products;
      initialTotalCount = shopResult.value.totalCount || initialProducts.length;
    }

    if (closetResult.status === "fulfilled" && closetResult.value?.success) {
      initialUserData = closetResult.value;
    }
  } catch (error) {
    console.error("Lỗi preload dữ liệu app:", error);
  }

  return (
    <MobileAppClient 
      initialProducts={initialProducts} 
      initialTotalCount={initialTotalCount}
      initialUserData={initialUserData}
    />
  );
}
