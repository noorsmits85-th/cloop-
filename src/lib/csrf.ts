const configuredOrigins = [
  "https://cloop-sable.vercel.app",
  process.env.NEXT_PUBLIC_SITE_URL,
  process.env.NEXT_PUBLIC_APP_URL,
  ...(process.env.NODE_ENV !== "production"
    ? ["http://localhost:3000", "http://127.0.0.1:3000"]
    : []),
]
  .filter((origin): origin is string => Boolean(origin && origin.trim()))
  .map((origin) => origin.trim().replace(/\/$/, ""));

export const ALLOWED_ORIGINS: string[] = Array.from(new Set(configuredOrigins));

export function isAllowedOrigin(origin: string | null | undefined): boolean {
  if (!origin) return false;
  const normalized = origin.trim().replace(/\/$/, "");
  return ALLOWED_ORIGINS.includes(normalized);
}

export function verifySameOriginRequest(req: Request): boolean {
  const method = (req.method || "GET").toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
    return true;
  }

  const secFetchSite = req.headers.get("sec-fetch-site")?.toLowerCase();
  if (secFetchSite === "cross-site") {
    return false;
  }

  const originHeader = req.headers.get("origin");
  if (originHeader) {
    return isAllowedOrigin(originHeader);
  }

  const refererHeader = req.headers.get("referer");
  if (refererHeader) {
    try {
      const refererOrigin = new URL(refererHeader).origin;
      return isAllowedOrigin(refererOrigin);
    } catch {
      return false;
    }
  }

  return false;
}
