/**
 * Trình bóc tách nội dung tin nhắn đính kèm Media (Ảnh, Video từ Google Drive / Cloudinary)
 */
export interface ParsedMediaMessage {
  text: string;
  images: string[];
  videos: string[];
}

function toSafeHttpsMediaUrl(rawUrl: string): string | null {
  const cleaned = rawUrl.trim().replace(/^["'<(\[]+|["'>)\]]+$/g, "");
  if (!cleaned) return null;
  try {
    const parsed = new URL(cleaned);
    if (parsed.protocol !== "https:") return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

export function parseMediaContent(rawContent: string): ParsedMediaMessage {
  if (!rawContent) {
    return { text: "", images: [], videos: [] };
  }

  const images: string[] = [];
  const videos: string[] = [];
  let text = rawContent;

  // 1. Khớp thẻ ảnh: [IMAGE:url] hoặc [IMG:url] (chỉ chấp nhận https://)
  text = text.replace(/\[\s*(?:IMAGE|IMG)\s*:\s*([^\]]+)\]/gi, (_, url) => {
    const safeUrl = toSafeHttpsMediaUrl(url);
    if (safeUrl && !images.includes(safeUrl)) images.push(safeUrl);
    return "";
  });

  // 2. Khớp thẻ video: [VIDEO:url] hoặc [VID:url] (chỉ chấp nhận https://)
  text = text.replace(/\[\s*(?:VIDEO|VID)\s*:\s*([^\]]+)\]/gi, (_, url) => {
    const safeUrl = toSafeHttpsMediaUrl(url);
    if (safeUrl && !videos.includes(safeUrl)) videos.push(safeUrl);
    return "";
  });

  // 3. Khớp markdown ảnh tiêu chuẩn: ![alt](url)
  text = text.replace(/!\[.*?\]\((https:\/\/[^\s\)]+)\)/gi, (_, url) => {
    const safeUrl = toSafeHttpsMediaUrl(url);
    if (safeUrl && !images.includes(safeUrl)) images.push(safeUrl);
    return "";
  });

  // 4. Khớp trực tiếp URL video Google Drive hoặc link đuôi video
  text = text.replace(
    /(https:\/\/(?:drive\.google\.com\/file\/[^\s\)]+\/preview|[^\s\)]+\.(?:mp4|webm|mov|m4v|quicktime)(?:\?[^\s\)]*)?))/gi,
    (matched) => {
      const safeUrl = toSafeHttpsMediaUrl(matched);
      if (safeUrl && !videos.includes(safeUrl)) {
        videos.push(safeUrl);
      }
      return "";
    }
  );

  // 5. Khớp trực tiếp URL ảnh Google Drive (lh3.googleusercontent.com), Cloudinary (res.cloudinary.com) hoặc link đuôi ảnh
  text = text.replace(
    /(https:\/\/(?:lh3\.googleusercontent\.com\/[^\s\)]+|res\.cloudinary\.com\/[^\s\)]+|drive\.google\.com\/uc\?[^\s\)]+|[^\s\)]+\.(?:png|jpg|jpeg|webp|gif|avif|heic)(?:\?[^\s\)]*)?))/gi,
    (matched) => {
      const safeUrl = toSafeHttpsMediaUrl(matched);
      if (safeUrl && !images.includes(safeUrl)) {
        images.push(safeUrl);
      }
      return "";
    }
  );

  return {
    text: text.trim(),
    images,
    videos,
  };
}
