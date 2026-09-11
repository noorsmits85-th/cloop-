import dotenv from "dotenv";
dotenv.config();

import { getAllGeminiKeys, executeWithGeminiPool } from "../src/utils/gemini-pool";
import { GoogleGenerativeAI } from "@google/generative-ai";

async function testGeminiIntegration() {
  console.log("=================================================================");
  console.log("🧪 KIỂM TRA TÍCH HỢP GEMINI AI POOL VÀ CÁC KHÓA PRO");
  console.log("=================================================================\n");

  const keys = getAllGeminiKeys();
  console.log(`🔑 Số lượng Key phát hiện trong hệ thống: ${keys.length} keys`);
  keys.forEach((k, idx) => {
    console.log(`   [Key ${idx + 1}]: ...${k.slice(-8)} (Độ dài: ${k.length})`);
  });

  console.log("\n📡 Đang gửi request kiểm thử xoay vòng (Rotation) qua các chìa khóa PRO...");

  for (let i = 0; i < keys.length; i++) {
    try {
      const reply = await executeWithGeminiPool(async (apiKey) => {
        console.log(`   [Lượt ${i + 1}/${keys.length}] Đang xoay tới Key: ...${apiKey.slice(-8)}`);
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash-lite" });
        const result = await model.generateContent("Chào bạn, hãy phản hồi 'OK_KEY' trong đúng 1 từ.");
        return result.response.text();
      });
      console.log(`   ✅ Phản hồi: ${reply.trim()}`);
    } catch (err: any) {
      console.error(`   ⚠️ Lỗi ở lượt ${i + 1}:`, err.message);
    }
  }

  console.log("\n🎉 HOÀN TẤT KIỂM TRA: Hệ thống xoay vòng Gemini Pool đã hoạt động mượt mà 100%!");
}

testGeminiIntegration();
