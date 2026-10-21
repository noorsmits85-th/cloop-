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
  let initialStatus: "SUCCESS" | "ERROR" = "ERROR";
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

    if (shopResult.status === "fulfilled" && shopResult.value) {
      if (shopResult.value.status === "SUCCESS" || shopResult.value.success) {
        initialProducts = shopResult.value.products || [];
        initialTotalCount = shopResult.value.totalCount || initialProducts.length;
        initialStatus = "SUCCESS";
      } else {
        initialStatus = "ERROR";
      }
    } else {
      initialStatus = "ERROR";
    }

    if (closetResult.status === "fulfilled" && closetResult.value?.success) {
      initialUserData = closetResult.value;
    }
  } catch (error) {
    console.error("Lỗi preload dữ liệu app:", error);
    initialStatus = "ERROR";
  }

  return (
    <MobileAppClient 
      initialProducts={initialProducts} 
      initialTotalCount={initialTotalCount}
      initialStatus={initialStatus}
      initialUserData={initialUserData}
    />
  );
}
