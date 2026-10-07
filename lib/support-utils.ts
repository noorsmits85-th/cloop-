/**
 * Trình bóc tách nội dung tin nhắn đính kèm Media (Ảnh, Video từ Google Drive)
 */
export interface ParsedMediaMessage {
  text: string;
  images: string[];
  videos: string[];
}

export function parseMediaContent(rawContent: string): ParsedMediaMessage {
  if (!rawContent) {
    return { text: "", images: [], videos: [] };
  }

  const images: string[] = [];
  const videos: string[] = [];
  let text = rawContent;

  const cleanMediaUrl = (url: string) =>
    url.trim().replace(/^["'<(\[]+|["'>)\]]+$/g, "");

  // 1. Khớp thẻ ảnh: [IMAGE:url] hoặc [IMG:url] (kể cả có khoảng trắng trong tag)
  text = text.replace(/\[\s*(?:IMAGE|IMG)\s*:\s*([^\]]+)\]/gi, (_, url) => {
    const clean = cleanMediaUrl(url);
    if (clean && !images.includes(clean)) images.push(clean);
    return "";
  });

  // 2. Khớp thẻ video: [VIDEO:url] hoặc [VID:url]
  text = text.replace(/\[\s*(?:VIDEO|VID)\s*:\s*([^\]]+)\]/gi, (_, url) => {
    const clean = cleanMediaUrl(url);
    if (clean && !videos.includes(clean)) videos.push(clean);
    return "";
  });

  // 3. Khớp markdown ảnh tiêu chuẩn: ![alt](url)
  text = text.replace(/!\[.*?\]\((https?:\/\/[^\s\)]+)\)/gi, (_, url) => {
    const clean = cleanMediaUrl(url);
    if (clean && !images.includes(clean)) images.push(clean);
    return "";
  });

  // 4. Khớp trực tiếp URL video Google Drive hoặc link đuôi video
  text = text.replace(
    /(https?:\/\/(?:drive\.google\.com\/file\/[^\s\)]+\/preview|[^\s\)]+\.(?:mp4|webm|mov|m4v|quicktime)(?:\?[^\s\)]*)?))/gi,
    (matched) => {
      const clean = cleanMediaUrl(matched);
      if (clean && !videos.includes(clean)) {
        videos.push(clean);
      }
      return "";
    }
  );

  // 5. Khớp trực tiếp URL ảnh Google Drive (lh3.googleusercontent.com), Cloudinary (res.cloudinary.com) hoặc link đuôi ảnh
  text = text.replace(
    /(https?:\/\/(?:lh3\.googleusercontent\.com\/[^\s\)]+|res\.cloudinary\.com\/[^\s\)]+|drive\.google\.com\/uc\?[^\s\)]+|[^\s\)]+\.(?:png|jpg|jpeg|webp|gif|avif|heic)(?:\?[^\s\)]*)?))/gi,
    (matched) => {
      const clean = cleanMediaUrl(matched);
      if (clean && !images.includes(clean)) {
        images.push(clean);
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
