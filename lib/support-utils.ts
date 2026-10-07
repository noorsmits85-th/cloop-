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

  // 1. Khớp thẻ ảnh: [IMAGE:url] hoặc [IMG:url] (kể cả có khoảng trắng trong tag)
  text = text.replace(/\[\s*(?:IMAGE|IMG)\s*:\s*([^\]]+)\]/gi, (_, url) => {
    const cleanUrl = url.trim();
    if (cleanUrl && !images.includes(cleanUrl)) images.push(cleanUrl);
    return "";
  });

  // 2. Khớp thẻ video: [VIDEO:url] hoặc [VID:url]
  text = text.replace(/\[\s*(?:VIDEO|VID)\s*:\s*([^\]]+)\]/gi, (_, url) => {
    const cleanUrl = url.trim();
    if (cleanUrl && !videos.includes(cleanUrl)) videos.push(cleanUrl);
    return "";
  });

  // 3. Khớp markdown ảnh tiêu chuẩn: ![alt](url)
  text = text.replace(/!\[.*?\]\((https?:\/\/[^\s\)]+)\)/gi, (_, url) => {
    const cleanUrl = url.trim();
    if (cleanUrl && !images.includes(cleanUrl)) images.push(cleanUrl);
    return "";
  });

  // 4. Khớp trực tiếp URL ảnh Google Drive (lh3.googleusercontent.com) hoặc link đuôi ảnh
  text = text.replace(/(https?:\/\/(?:lh3\.googleusercontent\.com\/[^\s\)]+|[^\s\)]+\.(?:png|jpg|jpeg|webp|gif)(?:\?[^\s\)]*)?))/gi, (matched) => {
    const cleanUrl = matched.trim();
    if (cleanUrl && !images.includes(cleanUrl)) {
      images.push(cleanUrl);
    }
    return "";
  });

  // 5. Khớp trực tiếp URL video Google Drive hoặc link đuôi video
  text = text.replace(/(https?:\/\/(?:drive\.google\.com\/file\/[^\s\)]+|[^\s\)]+\.(?:mp4|webm|mov)(?:\?[^\s\)]*)?))/gi, (matched) => {
    const cleanUrl = matched.trim();
    if (cleanUrl && !videos.includes(cleanUrl)) {
      videos.push(cleanUrl);
    }
    return "";
  });

  return {
    text: text.trim(),
    images,
    videos,
  };
}
