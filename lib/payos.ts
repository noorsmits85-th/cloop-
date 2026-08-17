import { PayOS } from '@payos/node';

// Luật Fail-Fast (Không Khoan Nhượng Với Môi Trường)
const clientId = process.env.PAYOS_CLIENT_ID;
const apiKey = process.env.PAYOS_API_KEY;
const checksumKey = process.env.PAYOS_CHECKSUM_KEY;

export const payos = clientId && apiKey && checksumKey
  ? new PayOS({ clientId, apiKey, checksumKey })
  : null;
