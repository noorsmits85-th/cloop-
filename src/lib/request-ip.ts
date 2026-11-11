export function getTrustedClientIp(req: Request): string {
  const vercelIp = req.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim();
  if (vercelIp) return vercelIp;

  if (process.env.TRUST_CLOUDFLARE_PROXY === "true") {
    const cfIp = req.headers.get("cf-connecting-ip")?.trim();
    if (cfIp) return cfIp;
  }

  const realIp = req.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  const forwardedFor = req.headers.get("x-forwarded-for")?.split(",").pop()?.trim();
  if (forwardedFor) return forwardedFor;

  return "127.0.0.1";
}
