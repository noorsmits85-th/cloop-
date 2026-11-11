import "server-only";
import crypto from "crypto";

/**
 * Verifies the Authorization: Bearer <CRON_SECRET> header in constant time.
 * Always fails closed (returns false) if CRON_SECRET is unset or empty.
 */
export function verifyCronRequest(req: Request): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || cronSecret.trim().length === 0) {
    return false;
  }

  const authHeader = req.headers.get("authorization") || "";
  const expected = `Bearer ${cronSecret}`;

  const actualBuf = Buffer.from(authHeader, "utf8");
  const expectedBuf = Buffer.from(expected, "utf8");

  if (actualBuf.length !== expectedBuf.length) {
    return false;
  }

  return crypto.timingSafeEqual(actualBuf, expectedBuf);
}

export const verifyCronSecret = verifyCronRequest;
