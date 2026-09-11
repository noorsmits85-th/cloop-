import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getProductDetail } from "@/src/lib/product-service";
import ProductDetailClient from "./_components/ProductDetailClient";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ type?: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const product = await getProductDetail(id);

  if (!product) {
    return {
      title: "Không tìm thấy trang phục | CLOOP",
      description: "Trang phục này có thể đã được gỡ hoặc chuyển nhượng.",
    };
  }

  const title = `${product.title || product.name} | Tủ Đồ CLOOP`;
  const description = product.description || `Thuê hoặc sở hữu ${product.title} cao cấp, tiện lợi và tiết kiệm tại CLOOP.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: product.images && product.images.length > 0 ? [product.images[0]] : [product.image],
    },
  };
}

export default async function ProductDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { type } = await searchParams;

  const product = await getProductDetail(id);

  if (!product) {
    return (
      <div className="min-h-[70vh] bg-[#FAF8F3] flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-stone-200/80 flex items-center justify-center text-stone-500 font-bold text-xl">
          404
        </div>
        <h2 className="text-base font-bold text-stone-800 font-heading">
          Không tìm thấy trang phục này trong kho lưu trữ CLOOP.
        </h2>
        <p className="text-xs text-stone-500 max-w-sm font-ui">
          Trang phục có thể đã được chủ tủ thu hồi hoặc đã sang tên đổi chủ.
        </p>
        <Link
          href="/shop"
          className="px-6 py-2.5 bg-[#183A2D] text-white font-bold text-xs rounded-full uppercase tracking-wider hover:bg-[#2A6E46] transition-colors inline-block"
        >
          Khám Phá Tủ Đồ Khác
        </Link>
      </div>
    );
  }

  return (
    <ProductDetailClient 
      initialProduct={product} 
      initialType={type} 
    />
  );
}