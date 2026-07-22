import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

// Khởi tạo Supabase client riêng cho hook này
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://notxrjsuukrrxdlboavo.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "temporary-placeholder-key";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const PLACEHOLDER_IMG = "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?q=80&w=600";

// Export các Type/Interface để page.tsx có thể dùng lại (đặc biệt là type Product)
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

  // Giữ nguyên array dịp mặc đồ như code gốc
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

  // Giữ nguyên 100% logic fetch của code gốc
  useEffect(() => {
    async function fetchRealMarketplaceData() {
      try {
        setProductsLoading(true);
        
        const { data: pData, error: pError } = await supabase.from("products").select("*").order("createdAt", { ascending: false });
        if (pError) throw pError;

        const { data: listingsData } = await supabase.from("Listing").select("*");
        const { data: imagesData } = await supabase.from("ProductImage").select("*");

        const productUserIds = [...new Set((pData || []).map((item: any) => item.userId || item.user_id).filter(Boolean))];
        let usersDataForProducts: any[] = [];
        
        if (productUserIds.length > 0) {
          // Giữ nguyên truy vấn 2 bảng "User" và "users" bằng Promise.all
          const [res1, res2] = await Promise.all([
            supabase.from("User").select("id, name").in("id", productUserIds),
            supabase.from("users").select("id, name").in("id", productUserIds)
          ]);
          usersDataForProducts = [...(res1.data || []), ...(res2.data || [])];
        }

        if (pData) {
          const mappedRents: Product[] = [];
          const mappedSells: Product[] = [];

          pData.forEach((item: any) => {
            const listingsArr = (listingsData || []).filter((l: any) => l.productId === item.id);
            const imagesArr = (imagesData || []).filter((img: any) => img.productId === item.id);

            const rentListing = listingsArr.find((l: any) => l.listingType === "RENT" && l.status === "AVAILABLE");
            const sellListing = listingsArr.find((l: any) => (l.listingType === "SELL" || l.listingType === "SALE") && l.status === "AVAILABLE");

            const rentPrice = rentListing ? Number(rentListing.basePrice) : 0;
            const sellPrice = sellListing ? Number(sellListing.basePrice) : 0;
            const effectiveRentPrice = rentPrice || item.rental_price;

            const storeRetailPrice = item.original_price || item.originalPrice || 500000;

            let currentImage = PLACEHOLDER_IMG;
            if (imagesArr.length > 0) {
              currentImage = imagesArr[0].url || currentImage;
            } else if (item.image_url || item.imageUrl) {
              currentImage = item.image_url || item.imageUrl;
            }

            const uId = item.userId || item.user_id;
            const matchedUser = usersDataForProducts.find((u: any) => u.id === uId);

            const baseProduct = {
              id: item.id,
              image: currentImage, 
              title: item.title || item.name || "Trang phục CLOOP",
              location: item.province || "Nghệ An", 
              rating: "5.0",   
              condition: item.condition === "GOOD" ? "Mới 95%" : "Mới 98%",
              size: item.size || "M",
              brand: item.brand || "Thiết kế Việt",
              // Giữ nguyên fallback "Thành viên CLOOP"
              ownerName: matchedUser?.name || item.owner_name || item.ownerName || "Thành viên CLOOP",
              userId: uId || "anonymous-user",
              storeRetailPrice,
              occasion: item.occasion || "Dạo phố"
            };

            if (effectiveRentPrice > 0) {
              mappedRents.push({
                ...baseProduct,
                type: "Thuê",
                listingTypeRaw: "RENT",
                price: effectiveRentPrice,
                rawPriceText: `${effectiveRentPrice.toLocaleString()}đ / ngày`,
                savedPercentage: Math.round(((storeRetailPrice - effectiveRentPrice) / storeRetailPrice) * 100),
              });
            }

            if (sellPrice > 0) {
              mappedSells.push({
                ...baseProduct,
                type: "Mua sắm",
                listingTypeRaw: "SELL",
                price: sellPrice,
                rawPriceText: `${sellPrice.toLocaleString()}đ`,
                savedPercentage: Math.round(((storeRetailPrice - sellPrice) / storeRetailPrice) * 100),
              });
            }
          });

          const allUniqueProducts = [...mappedRents, ...mappedSells].filter((v,i,a)=>a.findIndex(t=>(t.id === v.id))===i);

          setProducts(allUniqueProducts);
          setRentalProducts(mappedRents);
          setSaleProducts(mappedSells);

          setOccasions(prev => prev.map(occ => {
            if (occ.name === "All") return occ;
            const matchProd = allUniqueProducts.find(p => p.occasion === occ.name);
            return { ...occ, img: matchProd ? matchProd.image : "" };
          }));
        }

        const { data: blogData } = await supabase
          .from("BlogPost")
          .select("*")
          .filter("status", "neq", "HIDDEN")
          .order("isPinned", { ascending: false })
          .order("createdAt", { ascending: false })
          .limit(3);

        const defaultStories: BlogPreview[] = [
          {
            id: "story-1",
            title: "Tà Áo Dài trắng năm 18 tuổi",
            content: "Chiếc áo dài lụa tơ tằm mình mặc đúng một lần duy nhất vào buổi bế giảng cấp 3 năm ấy. Giữ mãi mùi nắng của ngày hạ cuối cùng...",
            coverImage: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?q=80&w=600",
            album: [],
            createdAt: new Date().toISOString(),
            authorName: "Trang Hoài",
            authorAvatar: ""
          }
        ];

        if (blogData && blogData.length > 0) {
          const productIds = blogData.map((b: any) => b.productId).filter(Boolean);
          const userIds = blogData.map((b: any) => b.userId || b.user_id).filter(Boolean);
          
          const { data: imagesData } = await supabase.from("ProductImage").select("*").in("productId", productIds);
          
          let allBlogUsers: any[] = [];
          if (userIds.length > 0) {
            // Giữ nguyên truy vấn 2 bảng
            const [res1, res2] = await Promise.all([
              supabase.from("User").select("id, name, avatar").in("id", userIds),
              supabase.from("users").select("id, name, avatar").in("id", userIds)
            ]);
            allBlogUsers = [...(res1.data || []), ...(res2.data || [])];
          }

          const mappedBlogs = blogData.map((b: any) => {
            const imgs = (imagesData || []).filter((img: any) => img.productId === b.productId).map((img: any) => img.url);
            const author = allBlogUsers.find((u: any) => u.id === (b.userId || b.user_id));
            
            const imgUrl = b.coverImage || b.cover_image;
            // Giữ nguyên điều kiện nhận diện ảnh kỹ thuật
            const isTechImage = imgUrl && (imgUrl.includes("screenshot") || imgUrl.includes("notxrjsuukrrxdlboavo") || imgUrl.includes("localhost"));

            return {
              id: b.id,
              title: b.title,
              content: b.content,
              coverImage: isTechImage || !imgUrl ? PLACEHOLDER_IMG : imgUrl,
              album: imgs.length > 0 ? imgs : [imgUrl || PLACEHOLDER_IMG],
              createdAt: b.createdAt,
              authorName: author?.name || "Thành viên CLOOP",
              authorAvatar: author?.avatar || ""
            };
          });
          setRecentStories(mappedBlogs);
        } else {
          setRecentStories(defaultStories);
        }

      } catch (err: any) {
        // Giữ nguyên nội dung log lỗi
        console.error("❌ LỖI VẬN HÀNH KHO DỮ LIỆU ĐỘNG TRANG CHỦ:", err);
      } finally {
        setProductsLoading(false);
      }
    }
    
    fetchRealMarketplaceData();
  }, []);

  return { products, rentalProducts, saleProducts, occasions, productsLoading, recentBlogs };
}