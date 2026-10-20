import { getShopProductsAction } from "@/app/actions/product";
import { getMyClosetMobileDataAction } from "@/app/actions/closet";
import MobileAppClient from "./MobileAppClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "CLOOP - Ứng Dụng Thời Trang",
  description: "Trải nghiệm ứng dụng thời trang CLOOP",
};

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, fallbackValue: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallbackValue), timeoutMs)),
  ]);
}

export default async function MobileAppPage() {
  let initialProducts: any[] = [];
  let initialTotalCount = 0;
  let initialUserData: any = null;

  try {
    const [prodRes, userRes] = await Promise.all([
      withTimeout(
        getShopProductsAction({
          type: "all",
          page: 1,
          limit: 30,
        }),
        1500,
        { success: false, products: [], totalCount: 0 }
      ),
      withTimeout<any>(
        getMyClosetMobileDataAction(),
        1200,
        { success: false, error: "Timeout fallback" }
      ),
    ]);

    if (prodRes && prodRes.success && prodRes.products) {
      initialProducts = prodRes.products;
      initialTotalCount = prodRes.totalCount || initialProducts.length;
    }

    if (userRes && userRes.success) {
      initialUserData = userRes;
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
