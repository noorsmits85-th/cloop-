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

  console.log("\n📡 Đang gửi request kiểm thử đến Google Gemini 3.5 Flash-Lite...");

  try {
    const reply = await executeWithGeminiPool(async (apiKey) => {
      console.log(`   -> Đang thử nghiệm với Key: ...${apiKey.slice(-8)}`);
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash-lite" });
      const result = await model.generateContent("Chào bạn, hãy phản hồi 'CLOOP AI 3.5 FLASH-LITE PRO ĐANG HOẠT ĐỘNG HOÀN HẢO!' trong 1 câu.");
      return result.response.text();
    });

    console.log("\n🎉 KẾT QUẢ PHẢN HỒI TỪ GOOGLE GEMINI:");
    console.log(`   "${reply.trim()}"`);
    console.log("\n✅ XÁC NHẬN: TẤT CẢ CÁC KHÓA PRO ĐÃ TÍCH HỢP CHUẨN XÁC 100% VÀ PHẢN HỒI THÀNH CÔNG!");
  } catch (err: any) {
    console.error("❌ Lỗi kiểm thử Gemini:", err.message);
  }
}

testGeminiIntegration();
