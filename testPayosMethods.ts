import 'dotenv/config';
import { payos } from './lib/payos';
if (!payos) {
  throw new Error("Missing PayOS config");
}
console.log(payos);
console.log(Object.getOwnPropertyNames(Object.getPrototypeOf(payos.paymentRequests)));
console.log(Object.getOwnPropertyNames(Object.getPrototypeOf(payos.webhooks)));
