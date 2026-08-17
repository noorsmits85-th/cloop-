import 'dotenv/config';
import { payos } from './lib/payos';
console.log(payos);
console.log(Object.getOwnPropertyNames(Object.getPrototypeOf(payos.paymentRequests)));
console.log(Object.getOwnPropertyNames(Object.getPrototypeOf(payos.webhooks)));
