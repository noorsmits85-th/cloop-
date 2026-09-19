import { getShopProductsAction } from "@/app/actions/product";
import { getMyClosetMobileDataAction } from "@/app/actions/closet";
import MobileAppClient from "./MobileAppClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "CLOOP App - Tủ Đồ Tuần Hoàn",
  description: "Trải nghiệm ứng dụng chia sẻ tủ đồ tuần hoàn CLOOP",
};

export default async function MobileAppPage() {
  let initialProducts: any[] = [];
  let initialTotalCount = 0;
  let initialUserData: any = null;

  try {
    const [prodRes, userRes] = await Promise.all([
      getShopProductsAction({
        type: "all",
        page: 1,
        limit: 30,
      }),
      getMyClosetMobileDataAction()
    ]);

    if (prodRes.success && prodRes.products) {
      initialProducts = prodRes.products;
      initialTotalCount = prodRes.totalCount || initialProducts.length;
    }

    if (userRes.success) {
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
