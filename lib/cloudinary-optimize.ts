/**
 * ⚡ CLOOP Image Performance Optimizer
 * Tự động chuyển đổi ảnh tải lên từ điện thoại (3-10MB) thành định dạng WebP siêu nhẹ (~30-50KB)
 * qua Cloudinary CDN on-the-fly, loại bỏ 100% tình trạng giật/khựng trên bản web.
 */

export function getOptimizedCloudinaryUrl(
  url: string | null | undefined,
  width: number = 400,
  quality: string = "auto"
): string {
  if (!url || typeof url !== "string") return "";
  
  // Chỉ áp dụng cho domain res.cloudinary.com
  if (!url.includes("res.cloudinary.com") || !url.includes("/upload/")) {
    return url;
  }

  // Tránh lặp lại transformation nếu URL đã có sẵn
  if (url.includes("/upload/w_") || url.includes("/upload/f_auto") || url.includes("/upload/c_")) {
    return url;
  }

  const transform = `w_${width},q_${quality},f_auto`;
  return url.replace("/upload/", `/upload/${transform}/`);
}
