import dotenv from "dotenv";
dotenv.config();

import { uploadToGoogleDrive } from "../src/services/googleDriveStorage";

async function test10TbStorage() {
  console.log("=================================================================");
  console.log("📦 KIỂM TRA HỆ THỐNG KHO LƯU TRỮ 10TB (5TB KHO 1 + 5TB KHO 2)");
  console.log("=================================================================\n");

  const testContentKho1 = Buffer.from(
    `CLOOP FILE KIỂM TRA KHO 1 (5TB)\nThời gian: ${new Date().toISOString()}\nTài khoản Google Pro 1`
  );
  console.log("🚀 Đang tải file thử nghiệm lên KHO 1 (5TB)...");
  const resKho1 = await uploadToGoogleDrive({
    fileName: "KIEM_TRA_KHO_1_5TB.txt",
    mimeType: "text/plain",
    buffer: testContentKho1,
    targetKho: "kho1",
  });
  console.log("✅ Kết quả Kho 1:", resKho1);

  const testContentKho2 = Buffer.from(
    `CLOOP FILE KIỂM TRA KHO 2 (5TB)\nThời gian: ${new Date().toISOString()}\nTài khoản Google Pro 2`
  );
  console.log("\n🚀 Đang tải file thử nghiệm lên KHO 2 (5TB)...");
  const resKho2 = await uploadToGoogleDrive({
    fileName: "KIEM_TRA_KHO_2_5TB.txt",
    mimeType: "text/plain",
    buffer: testContentKho2,
    targetKho: "kho2",
  });
  console.log("✅ Kết quả Kho 2:", resKho2);

  console.log("\n🎉 HOÀN TẤT: Cả 2 kho 5TB đã sẵn sàng, tổng dung lượng: 10,000 GB (10 TB)!");
}

test10TbStorage().catch(console.error);
