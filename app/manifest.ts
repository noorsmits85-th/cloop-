import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "CLOOP - Fashion In A Loop",
    short_name: "CLOOP",
    description: "Nền tảng thời trang tuần hoàn với trải nghiệm thuê đồ, mua sắm và AI Stylist native-like.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#FAF8F3",
    theme_color: "#183A2D",
    orientation: "portrait",
    icons: [
      {
        src: "/loogo.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/loogo.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    categories: ["shopping", "lifestyle", "fashion"],
  };
}
