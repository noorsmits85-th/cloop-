const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_BASE64_CHARS = Math.ceil((MAX_IMAGE_BYTES * 4) / 3) + 128;

export type SafeImagePayload = {
  buffer: Buffer;
  base64: string;
  mimeType: "image/jpeg" | "image/png" | "image/webp";
};

function detectImageMime(buffer: Buffer): SafeImagePayload["mimeType"] | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }

  if (
    buffer.length >= 4 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return "image/png";
  }

  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "image/webp";
  }

  return null;
}

export function parseSafeBase64Image(input: string): SafeImagePayload {
  if (typeof input !== "string" || input.length === 0) {
    throw new Error("INVALID_IMAGE");
  }

  if (input.length > MAX_BASE64_CHARS) {
    throw new Error("IMAGE_TOO_LARGE");
  }

  const dataUrlMatch = input.match(/^data:image\/[a-zA-Z0-9.+-]+;base64,([A-Za-z0-9+/=\r\n]+)$/);
  const base64 = (dataUrlMatch?.[1] || input).replace(/\s/g, "");

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
