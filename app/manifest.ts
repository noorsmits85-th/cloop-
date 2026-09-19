import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "CLOOP - Thời Trang Tuần Hoàn",
    short_name: "CLOOP",
    description: "Nền tảng chia sẻ tủ đồ và thời trang tuần hoàn CLOOP.",
    start_url: "/app",
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
