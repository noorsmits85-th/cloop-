import dns from "node:dns/promises";
import net from "node:net";
import { validateBinaryMediaBuffer } from "./server-image-guard";

const ALLOWED_MEDIA_DOMAINS = [
  "res.cloudinary.com",
  "notxrjsuukrrxdlboavo.supabase.co",
  "storage.googleapis.com",
  "lh3.googleusercontent.com",
];

function isAllowedMediaHostname(hostname: string): boolean {
  const normalized = hostname.trim().toLowerCase().replace(/\.$/, "");
  if (!normalized || net.isIP(normalized) !== 0) {
    return false;
  }

  return ALLOWED_MEDIA_DOMAINS.some(
    (domain) => normalized === domain || normalized.endsWith(`.${domain}`)
  );
}

function isBlockedIpv4(ip: string): boolean {
  const parts = ip.split(".").map((octet) => Number(octet));
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) {
    return true;
  }

  const [a, b] = parts;

  // 0.0.0.0/8 (Current network)
  if (a === 0) return true;
  // 10.0.0.0/8 (RFC1918 private)
  if (a === 10) return true;
  // 100.64.0.0/10 (Carrier-grade NAT)
  if (a === 100 && b >= 64 && b <= 127) return true;
  // 127.0.0.0/8 (Loopback)
  if (a === 127) return true;
  // 169.254.0.0/16 (Link-local / Cloud metadata)
  if (a === 169 && b === 254) return true;
  // 172.16.0.0/12 (RFC1918 private)
  if (a === 172 && b >= 16 && b <= 31) return true;
  // 192.168.0.0/16 (RFC1918 private)
  if (a === 192 && b === 168) return true;
  // 192.0.0.0/24, 192.0.2.0/24, 198.18.0.0/15, 198.51.100.0/24, 203.0.113.0/24
  if (a === 192 && b === 0) return true;
  if (a === 198 && (b === 18 || b === 19)) return true;
  // Multicast & Reserved (224.0.0.0/4, 240.0.0.0/4)
  if (a >= 224) return true;

  return false;
}

function isBlockedIpAddress(rawIp: string): boolean {
  const ip = rawIp.trim().toLowerCase();
  const family = net.isIP(ip);
  if (family === 0) return true;

  if (family === 4) {
    return isBlockedIpv4(ip);
  }

  // IPv6 checks
  if (ip === "::" || ip === "::1" || ip === "0:0:0:0:0:0:0:1" || ip === "0:0:0:0:0:0:0:0") {
    return true;
  }

  // Reject IPv4-mapped IPv6 addresses (::ffff:...)
  if (ip.startsWith("::ffff:")) {
    return true;
  }

  // Unique local addresses (fc00::/7 -> fc00..fdff)
  if (ip.startsWith("fc") || ip.startsWith("fd")) {
    return true;
  }

  // Link-local addresses (fe80::/10 -> fe8, fe9, fea, feb)
  if (
    ip.startsWith("fe8") ||
    ip.startsWith("fe9") ||
    ip.startsWith("fea") ||
    ip.startsWith("feb")
  ) {
    return true;
  }

  // Multicast (ff00::/8)
  if (ip.startsWith("ff")) {
    return true;
  }

  return false;
}

export function isAllowedMediaUrl(rawUrl: string): boolean {
  if (typeof rawUrl !== "string" || rawUrl.trim().length === 0) {
    return false;
  }

  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== "https:") return false;
    if (parsed.username || parsed.password) return false;
    return isAllowedMediaHostname(parsed.hostname);
  } catch {
    return false;
  }
}

export async function fetchSafeAllowedImage(
  rawUrl: string,
  maxBytes = 10 * 1024 * 1024
): Promise<{ buffer: Buffer; mimeType: string; extension: string }> {
  if (!isAllowedMediaUrl(rawUrl)) {
    throw new Error("SSRF_BLOCKED_URL");
  }

  const parsed = new URL(rawUrl);
  const records = await dns.lookup(parsed.hostname, { all: true });
  if (!records || records.length === 0) {
    throw new Error("SSRF_DNS_RESOLUTION_FAILED");
  }

  for (const record of records) {
    if (isBlockedIpAddress(record.address)) {
      throw new Error("SSRF_BLOCKED_IP");
    }
  }

  const response = await fetch(parsed.toString(), {
    method: "GET",
    redirect: "error",
    signal: AbortSignal.timeout(6000),
    headers: {
      Accept: "image/jpeg,image/png,image/webp,image/gif",
    },
  });

  if (!response.ok) {
    throw new Error(`IMAGE_FETCH_HTTP_${response.status}`);
  }

  const contentLengthHeader = response.headers.get("content-length");
  if (contentLengthHeader) {
    const declaredLength = Number(contentLengthHeader);
    if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
      throw new Error("MEDIA_TOO_LARGE");
    }
  }

  if (!response.body) {
    throw new Error("IMAGE_EMPTY_BODY");
  }

  const reader = response.body.getReader();
  const chunks: Buffer[] = [];
  let totalBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel();
        throw new Error("MEDIA_TOO_LARGE");
      }
      chunks.push(Buffer.from(value));
    }
  }

  const buffer = Buffer.concat(chunks, totalBytes);
  const { mimeType, extension } = validateBinaryMediaBuffer(buffer, {
    allowVideo: false,
    maxBytes,
  });

  return {
    buffer,
    mimeType,
    extension,
  };
}
