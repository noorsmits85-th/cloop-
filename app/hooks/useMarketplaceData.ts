import { useState, useEffect } from "react";
import { getShopProductsAction } from "@/app/actions/product";
import { getPublicBlogFeedAction } from "@/app/actions/blog";

export const PLACEHOLDER_IMG = "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?q=80&w=600";

export interface Product {
  id: string;
  image: string;
  type: string;
  listingTypeRaw: string;
  title: string;
  price: number;
  rawPriceText: string;
  location: string;
  rating: string;
  condition: string;
  size?: string;
  brand?: string;
  ownerName?: string;
  userId: string;
  storeRetailPrice: number;
  savedPercentage: number;
  occasion: string;
}

export interface BlogPreview {
  id: string;
  title: string;
  content: string;
  coverImage: string;
  album: string[];
  createdAt: string;
  authorName?: string;
  authorAvatar?: string;
}

export interface OccasionItem { name: string; label: string; img: string; }

export function useMarketplaceData() {
  const [products, setProducts] = useState<Product[]>([]);
  const [rentalProducts, setRentalProducts] = useState<Product[]>([]);
  const [saleProducts, setSaleProducts] = useState<Product[]>([]);
  const [recentBlogs, setRecentStories] = useState<BlogPreview[]>([]);
  const [productsLoading, setProductsLoading] = useState<boolean>(true);

  const [occasions, setOccasions] = useState<OccasionItem[]>([
    { name: "All", label: "Tất cả đồ", img: "" },
    { name: "Tiệc cưới", label: "Tiệc cưới", img: "" },
    { name: "Dạ hội", label: "Dạ hội", img: "" },
    { name: "Dạo phố", label: "Dạo phố", img: "" },
    { name: "Áo dài", label: "Áo dài", img: "" },
    { name: "Đi biển", label: "Đi biển", img: "" },
    { name: "Kỷ yếu", label: "Kỷ yếu", img: "" },
    { name: "Lễ hội", label: "Lễ hội", img: "" },
    { name: "Công sở", label: "Công sở", img: "" }
  ]);

  useEffect(() => {
    async function fetchRealMarketplaceData() {
      try {
        setProductsLoading(true);
        const [shopItems, blogRes] = await Promise.all([
          getShopProductsAction({}),
          getPublicBlogFeedAction()
        ]);

        const mappedRents: Product[] = [];
        const mappedSells: Product[] = [];

        (shopItems || []).forEach((item: any) => {
          const storeRetailPrice = 500000;
          const baseProduct = {
            id: item.id,
            image: item.imageUrl || PLACEHOLDER_IMG,
            title: item.title || "Trang phục CLOOP",
            location: item.province || "Hà Nội",
            rating: "5.0",
            condition: item.condition === "GOOD" ? "Mới 95%" : "Mới 98%",
            size: item.size || "M",
            brand: item.brand || "Thiết kế Việt",
            ownerName: item.ownerName || "Thành viên CLOOP",
            userId: item.userId || "anonymous-user",
            storeRetailPrice,
            occasion: item.occasion || "Dạo phố"
          };

          if (item.rentalPrice > 0) {
            mappedRents.push({
              ...baseProduct,
              type: "Thuê",
              listingTypeRaw: "RENT",
              price: item.rentalPrice,
              rawPriceText: `${item.rentalPrice.toLocaleString()}đ / ngày`,
              savedPercentage: Math.round(((storeRetailPrice - item.rentalPrice) / storeRetailPrice) * 100),
            });
          }

          if (item.salePrice > 0) {
            mappedSells.push({
              ...baseProduct,
              type: "Mua sắm",
              listingTypeRaw: "SELL",
              price: item.salePrice,
              rawPriceText: `${item.salePrice.toLocaleString()}đ`,
              savedPercentage: Math.round(((storeRetailPrice - item.salePrice) / storeRetailPrice) * 100),
            });
          }
        });

        const allUniqueProducts = [...mappedRents, ...mappedSells].filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);
        setProducts(allUniqueProducts);
        setRentalProducts(mappedRents);
        setSaleProducts(mappedSells);

        setOccasions(prev => prev.map(occ => {
          if (occ.name === "All") return occ;
          const matchProd = allUniqueProducts.find(p => p.occasion === occ.name);
          return { ...occ, img: matchProd ? matchProd.image : "" };
        }));

        if (blogRes.success && blogRes.posts.length > 0) {
          setRecentStories(
            blogRes.posts.slice(0, 3).map((b: any) => ({
              id: b.id,
              title: b.title,
              content: b.content,
              coverImage: b.cover_image || PLACEHOLDER_IMG,
              album: [b.cover_image || PLACEHOLDER_IMG],
              createdAt: b.createdAt,
              authorName: b.author?.name || "Thành viên CLOOP",
              authorAvatar: b.author?.avatar || ""
            }))
          );
        }
      } catch (err) {
        console.error("Lỗi tải dữ liệu trang chủ:", err);
      } finally {
        setProductsLoading(false);
      }
    }

    fetchRealMarketplaceData();
  }, []);

  return { products, rentalProducts, saleProducts, occasions, productsLoading, recentBlogs };
}
