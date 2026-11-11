import { ALLOWED_ORIGINS } from "./csrf";

export function getCorsHeaders(
  req: Request,
  methods: string[] = ["GET", "POST", "OPTIONS"]
): Record<string, string> {
  const rawOrigin = req.headers.get("origin")?.trim().replace(/\/$/, "") || "";
  const headers: Record<string, string> = {
    Vary: "Origin",
    "Access-Control-Allow-Methods": methods.join(", "),
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-CSRF-Token",
    "Access-Control-Max-Age": "86400",
  };

  if (rawOrigin && ALLOWED_ORIGINS.includes(rawOrigin)) {
    headers["Access-Control-Allow-Origin"] = rawOrigin;
    headers["Access-Control-Allow-Credentials"] = "true";
  }

  return headers;
}
