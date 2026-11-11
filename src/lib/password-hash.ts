import "server-only";
import crypto from "crypto";

const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LEN = 64;
const SALT_LEN = 16;

function scryptAsync(
  password: string,
  salt: Buffer,
  keylen: number,
  options: crypto.ScryptOptions
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, keylen, options, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey);
    });
  });
}

/**
 * Hashes a plaintext password using scrypt (N=16384, r=8, p=1, 16-byte random salt, 64-byte key).
 * Output format: scrypt$16384$8$1$<saltHex>$<hashHex>
 */
export async function hashPasswordScrypt(password: string): Promise<string> {
  const normalized = password.normalize("NFKC");
  const salt = crypto.randomBytes(SALT_LEN);
  const derivedKey = await scryptAsync(normalized, salt, KEY_LEN, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
  });
  return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt.toString("hex")}$${derivedKey.toString("hex")}`;
}

/**
 * Verifies a plaintext password against a stored scrypt hash in constant time.
 * Never falls back to plaintext equality.
 */
export async function verifyPasswordScrypt(
  password: string,
  stored: string
): Promise<boolean> {
  if (!stored || typeof stored !== "string" || !stored.startsWith("scrypt$")) {
    return false;
  }

  const parts = stored.split("$");
  if (parts.length !== 6) {
    return false;
  }

  const n = Number.parseInt(parts[1], 10);
  const r = Number.parseInt(parts[2], 10);
  const p = Number.parseInt(parts[3], 10);
  const saltHex = parts[4];
  const hashHex = parts[5];

  if (!Number.isFinite(n) || !Number.isFinite(r) || !Number.isFinite(p) || !saltHex || !hashHex) {
    return false;
  }

  try {
    const salt = Buffer.from(saltHex, "hex");
    const expectedKey = Buffer.from(hashHex, "hex");
    if (salt.length === 0 || expectedKey.length === 0) {
      return false;
    }

    const normalized = password.normalize("NFKC");
    const derivedKey = await scryptAsync(normalized, salt, expectedKey.length, {
      N: n,
      r: r,
      p: p,
    });

    if (derivedKey.length !== expectedKey.length) {
      return false;
    }

    return crypto.timingSafeEqual(derivedKey, expectedKey);
  } catch {
    return false;
  }
}

function getOtpHmacSecret(): string {
  const secret =
    process.env.OTP_HMAC_SECRET ||
    process.env.SHIPPING_SECRET ||
    process.env.CRON_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!secret) {
    // Ephemeral process-local secret when no server secret env var is configured in local dev
    const globalForOtp = globalThis as unknown as { __cloopOtpSecret?: string };
    if (!globalForOtp.__cloopOtpSecret) {
      globalForOtp.__cloopOtpSecret = crypto.randomBytes(32).toString("hex");
    }
    return globalForOtp.__cloopOtpSecret;
  }

  return secret;
}

/**
 * Computes an HMAC-SHA256 digest binding the target (phone/email) and OTP code.
 */
export function hashOtpHmac(target: string, otp: string): string {
  const normalizedTarget = target.trim().toLowerCase();
  const normalizedOtp = otp.trim();
  return crypto
    .createHmac("sha256", getOtpHmacSecret())
    .update(`${normalizedTarget}:${normalizedOtp}`)
    .digest("hex");
}

/**
 * Verifies an OTP against a stored hex HMAC-SHA256 digest using constant-time comparison.
 */
export function verifyOtpHmac(target: string, otp: string, digest: string): boolean {
  if (!digest || typeof digest !== "string") {
    return false;
  }
  const computed = hashOtpHmac(target, otp);
  const computedBuf = Buffer.from(computed, "hex");
  const digestBuf = Buffer.from(digest, "hex");

  if (computedBuf.length === 0 || computedBuf.length !== digestBuf.length) {
    return false;
  }

  return crypto.timingSafeEqual(computedBuf, digestBuf);
}
