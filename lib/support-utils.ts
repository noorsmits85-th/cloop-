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

  // 1. Khớp thẻ ảnh: [IMAGE:url] hoặc [IMG:url]
  text = text.replace(/\[(?:IMAGE|IMG):([^\]]+)\]/gi, (_, url) => {
    const cleanUrl = url.trim();
    if (cleanUrl) images.push(cleanUrl);
    return "";
  });

  // 2. Khớp thẻ video: [VIDEO:url] hoặc [VID:url]
  text = text.replace(/\[(?:VIDEO|VID):([^\]]+)\]/gi, (_, url) => {
    const cleanUrl = url.trim();
    if (cleanUrl) videos.push(cleanUrl);
    return "";
  });

  // 3. Khớp markdown ảnh tiêu chuẩn: ![alt](url)
  text = text.replace(/!\[.*?\]\((https?:\/\/[^\s\)]+)\)/gi, (_, url) => {
    const cleanUrl = url.trim();
    if (cleanUrl) images.push(cleanUrl);
    return "";
  });

  return {
    text: text.trim(),
    images,
    videos,
  };
}
