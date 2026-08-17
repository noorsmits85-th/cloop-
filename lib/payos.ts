import { PayOS } from '@payos/node';

// Luật Fail-Fast (Không Khoan Nhượng Với Môi Trường)
const clientId = process.env.PAYOS_CLIENT_ID;
const apiKey = process.env.PAYOS_API_KEY;
const checksumKey = process.env.PAYOS_CHECKSUM_KEY;

if (!clientId || !apiKey || !checksumKey) {
  throw new Error("Missing PAYOS Config: PAYOS_CLIENT_ID, PAYOS_API_KEY, and PAYOS_CHECKSUM_KEY must be set in the environment.");
}

export const payos = new PayOS({ clientId, apiKey, checksumKey });
