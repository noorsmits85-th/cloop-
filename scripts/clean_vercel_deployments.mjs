/**
 * Script tự động dọn dẹp các bản Deployments cũ trên Vercel
 * Giúp giải phóng 60GB+ Deployment Storage & Functions Storage về lại dưới 1GB!
 * 
 * Cách chạy:
 * 1. Tạo Vercel Token tại: https://vercel.com/account/tokens (chỉ mất 10s)
 * 2. Chạy lệnh: node scripts/clean_vercel_deployments.mjs <VERCEL_TOKEN>
 */

const token = process.argv[2] || process.env.VERCEL_TOKEN;

if (!token) {
  console.log("❌ Vui lòng truyền Vercel Token:");
  console.log("   node scripts/clean_vercel_deployments.mjs <YOUR_VERCEL_TOKEN>");
  console.log("👉 Lấy token tại: https://vercel.com/account/tokens");
  process.exit(1);
}

async function cleanDeployments() {
  console.log("🔍 Đang kết nối tới Vercel API để quét danh sách Deployments...");

  try {
    const res = await fetch("https://api.vercel.com/v6/deployments?limit=100", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("❌ Lỗi gọi Vercel API:", err);
      return;
    }

    const data = await res.json();
    const deployments = data.deployments || [];

    console.log(`📦 Tìm thấy tổng cộng: ${deployments.length} bản deployments`);

    let deletedCount = 0;
    // Bỏ qua bản deployment đang ở production gần nhất (bản mới nhất)
    const toDelete = deployments.slice(2); // Giữ lại 2 bản mới nhất phòng hờ

    console.log(`🗑️ Bắt đầu dọn dẹp ${toDelete.length} bản deployment cũ...`);

    for (const dep of toDelete) {
      try {
        console.log(`Đang xóa deployment: ${dep.url} (${dep.uid})...`);
        const delRes = await fetch(`https://api.vercel.com/v13/deployments/${dep.uid}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (delRes.ok) {
          deletedCount++;
        } else {
          console.warn(`⚠️ Không thể xóa ${dep.uid}: HTTP ${delRes.status}`);
        }
      } catch (e) {
        console.warn(`⚠️ Lỗi khi xóa ${dep.uid}:`, e.message);
      }
    }

    console.log(`\n🎉 HOÀN TẤT! Đã xóa thành công ${deletedCount} bản deployments cũ!`);
    console.log(`Dung lượng Storage trên Vercel Dashboard sẽ giảm mạnh trong vài phút tới.`);
  } catch (err) {
    console.error("❌ Lỗi không mong muốn:", err);
  }
}

cleanDeployments();
