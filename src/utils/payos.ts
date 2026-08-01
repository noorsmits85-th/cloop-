import { PayOS } from "@payos/node";

const clientId = process.env.PAYOS_CLIENT_ID || "demo-client-id";
const apiKey = process.env.PAYOS_API_KEY || "demo-api-key";
const checksumKey = process.env.PAYOS_CHECKSUM_KEY || "demo-checksum-key";

// Khởi tạo SDK PayOS
export const payos = new PayOS({ clientId, apiKey, checksumKey });
