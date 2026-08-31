import "server-only";
import { randomInt } from "crypto";

export function generatePayOSOrderCode() {
  const suffix = randomInt(100, 1000);
  const orderCode = Number(`${Date.now()}${suffix}`);

  if (!Number.isSafeInteger(orderCode)) {
    throw new Error("Cannot generate a safe PayOS order code.");
  }

  return orderCode;
}
