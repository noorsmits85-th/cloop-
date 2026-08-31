"use server";

export async function createDepositPayment(amount: number) {
  void amount;

  return {
    success: false,
    message:
      "Tinh nang nap vi tien that dang tam khoa de bao ve dong tien. Vui long dung luong mua La qua CoinTopUp co hoa don va webhook xac thuc.",
  };
}
