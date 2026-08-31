import { PayOS } from "@payos/node";

const clientId = process.env.PAYOS_CLIENT_ID;
const apiKey = process.env.PAYOS_API_KEY;
const checksumKey = process.env.PAYOS_CHECKSUM_KEY;

// Khởi tạo SDK PayOS
export const payos = clientId && apiKey && checksumKey
  ? new PayOS({ clientId, apiKey, checksumKey })
  : null;
