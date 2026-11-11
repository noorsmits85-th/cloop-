const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_BASE64_CHARS = Math.ceil((MAX_IMAGE_BYTES * 4) / 3) + 128;

export type SafeImagePayload = {
  buffer: Buffer;
  base64: string;
  mimeType: "image/jpeg" | "image/png" | "image/webp";
};

function hasExecutableOrMarkupSignature(buffer: Buffer): boolean {
  if (buffer.length >= 2 && buffer[0] === 0x4d && buffer[1] === 0x5a) {
    // Windows PE/MZ executable
    return true;
  }
  if (
    buffer.length >= 4 &&
    buffer[0] === 0x7f &&
    buffer[1] === 0x45 &&
    buffer[2] === 0x4c &&
    buffer[3] === 0x46
  ) {
    // ELF binary
    return true;
  }
  if (buffer.length >= 2 && buffer[0] === 0x23 && buffer[1] === 0x21) {
    // Shebang script (#!)
    return true;
  }

  const headText = buffer
    .subarray(0, Math.min(buffer.length, 512))
    .toString("utf8")
    .trimStart()
    .toLowerCase();

  if (
    headText.startsWith("<svg") ||
    headText.startsWith("<!doctype html") ||
    headText.startsWith("<html") ||
    headText.startsWith("<script") ||
    headText.includes("<svg") ||
    headText.includes("<script")
  ) {
    return true;
  }

  return false;
}

export function validateBinaryMediaBuffer(
  buffer: Buffer,
  options?: { allowVideo?: boolean; maxBytes?: number }
): { mimeType: string; extension: string } {
  const allowVideo = options?.allowVideo ?? false;
  const maxBytes = options?.maxBytes ?? 10 * 1024 * 1024;

  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new Error("INVALID_MEDIA_EMPTY");
  }

  if (buffer.length > maxBytes) {
    throw new Error("MEDIA_TOO_LARGE");
  }

  if (hasExecutableOrMarkupSignature(buffer)) {
    throw new Error("FORBIDDEN_MEDIA_SIGNATURE");
  }

  // JPEG: FF D8 FF
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return { mimeType: "image/jpeg", extension: "jpg" };
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { mimeType: "image/png", extension: "png" };
  }

  // WEBP: RIFF....WEBP
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return { mimeType: "image/webp", extension: "webp" };
  }

  // GIF: GIF87a / GIF89a
  if (buffer.length >= 6) {
    const gifHeader = buffer.subarray(0, 6).toString("ascii");
    if (gifHeader === "GIF87a" || gifHeader === "GIF89a") {
      return { mimeType: "image/gif", extension: "gif" };
    }
  }

  if (allowVideo) {
    // MP4 / QuickTime ISO Base Media File Format: 'ftyp' at offset 4..8
    if (
      buffer.length >= 12 &&
      buffer.subarray(4, 8).toString("ascii") === "ftyp"
    ) {
      const brand = buffer.subarray(8, 12).toString("ascii");
      if (brand === "qt  ") {
        return { mimeType: "video/quicktime", extension: "mov" };
      }
      return { mimeType: "video/mp4", extension: "mp4" };
    }

    // WEBM / Matroska EBML header: 1A 45 DF A3
    if (
      buffer.length >= 4 &&
      buffer[0] === 0x1a &&
      buffer[1] === 0x45 &&
      buffer[2] === 0xdf &&
      buffer[3] === 0xa3
    ) {
      return { mimeType: "video/webm", extension: "webm" };
    }
  }

  throw new Error("UNSUPPORTED_MEDIA_TYPE");
}

function detectImageMime(buffer: Buffer): SafeImagePayload["mimeType"] | null {
  try {
    const { mimeType } = validateBinaryMediaBuffer(buffer, {
      allowVideo: false,
      maxBytes: MAX_IMAGE_BYTES,
    });
    if (
      mimeType === "image/jpeg" ||
      mimeType === "image/png" ||
      mimeType === "image/webp"
    ) {
      return mimeType;
    }
    return null;
  } catch {
    return null;
  }
}

export function parseSafeBase64Image(input: string): SafeImagePayload {
  if (typeof input !== "string" || input.length === 0) {
    throw new Error("INVALID_IMAGE");
  }

  if (input.length > MAX_BASE64_CHARS) {
    throw new Error("IMAGE_TOO_LARGE");
  }

  const dataUrlMatch = input.match(/^data:image\/([a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=\r\n]+)$/);
  if (dataUrlMatch?.[1]?.toLowerCase().includes("svg")) {
    throw new Error("UNSUPPORTED_IMAGE_TYPE");
  }

  const base64 = (dataUrlMatch?.[2] || input).replace(/\s/g, "");

  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) {
    throw new Error("INVALID_IMAGE");
  }

  const buffer = Buffer.from(base64, "base64");
  if (buffer.length === 0) {
    throw new Error("INVALID_IMAGE");
  }

  if (buffer.length > MAX_IMAGE_BYTES) {
    throw new Error("IMAGE_TOO_LARGE");
  }

  const mimeType = detectImageMime(buffer);
  if (!mimeType) {
    throw new Error("UNSUPPORTED_IMAGE_TYPE");
  }

  return {
    buffer,
    base64: buffer.toString("base64"),
    mimeType,
  };
}
