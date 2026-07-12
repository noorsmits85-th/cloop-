/**
 * Đường dây kết nối riêng biệt để gọi bộ não Gemini AI của CLOOP
 * @param base64Image Chuỗi dữ liệu ảnh lookbook định dạng Base64
 * ✅ FIX: Bọc toàn bộ trong try/catch, không crash app khi key sai hoặc API lỗi
 */
export const fetchAiSuggestion = async (base64Image: string) => {
  try {
    const response = await fetch("/api/ai-suggest", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ base64Image }),
    });

    if (!response.ok) {
      // ✅ FIX: Không throw — chỉ log và trả về failed gracefully
      console.warn("⚠️ AI suggest API không khả dụng, bỏ qua.");
      return { success: false, error: "AI tạm thời bảo trì" };
    }

    const result = await response.json();
    return { success: true, data: result.suggestion };

  } catch (error: any) {
    // ✅ FIX: Không để lỗi này làm crash luồng upload chính
    console.warn("⚠️ Bỏ qua AI suggestion do lỗi kết nối:", error?.message);
    return {
      success: false,
      error: "Bộ não AI đang bận, tiếp tục đăng đồ bình thường.",
    };
  }
};