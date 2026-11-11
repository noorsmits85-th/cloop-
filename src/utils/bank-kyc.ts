export function normalizeVietnameseName(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toUpperCase()
    .trim();
}

export function verifyBankKyc(registeredName?: string | null, bankHolderName?: string | null): boolean {
  if (!registeredName || !bankHolderName) return false;
  const normReg = normalizeVietnameseName(registeredName).replace(/[^A-Z0-9\s]/g, "");
  const normBank = normalizeVietnameseName(bankHolderName).replace(/[^A-Z0-9\s]/g, "");

  if (!normReg || !normBank || normReg.length < 2 || normBank.length < 2) return false;

  const regTokens = normReg.split(/\s+/).filter(Boolean);
  const bankTokens = normBank.split(/\s+/).filter(Boolean);

  // Yêu cầu họ tên đầy đủ tối thiểu 2 từ riêng biệt (chống tên 1 từ hoặc lặp từ kiểu "NGUYEN NGUYEN")
  const uniqueRegTokens = new Set(regTokens);
  const uniqueBankTokens = new Set(bankTokens);
  if (regTokens.length < 2 || bankTokens.length < 2) return false;
  if (uniqueRegTokens.size < 2 || uniqueBankTokens.size < 2) return false;

  // Bắt buộc khớp toàn bộ chuỗi token họ tên sau chuẩn hóa (chặn hoàn toàn lỗi trùng 2/3 từ kiểu "NGUYEN VAN AN" vs "NGUYEN VAN BINH")
  if (regTokens.length !== bankTokens.length) return false;
  for (let i = 0; i < regTokens.length; i++) {
    if (regTokens[i] !== bankTokens[i]) {
      return false;
    }
  }

  return true;
}
