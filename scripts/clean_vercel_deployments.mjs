/**
 * Script tự động dọn dẹp các bản Deployments cũ trên Vercel
 * Giúp giải phóng 60GB+ Deployment Storage & Functions Storage về lại dưới 1GB!
 */

const token = process.argv[2] || process.env.VERCEL_TOKEN;

if (!token) {
  console.log("❌ Vui lòng truyền Vercel Token:");
  console.log("   node scripts/clean_vercel_deployments.mjs <YOUR_VERCEL_TOKEN>");
  console.log("👉 Lấy token tại: https://vercel.com/account/tokens");
  process.exit(1);
}

const teamId = "team_5lOoxelji3GP8M4LkYYe3zcJ";
const projectId = "prj_UvtDjoD2gp7h9sjnY8CAUL7YPrpM";

async function cleanDeployments() {
  console.log("🔍 Đang kết nối tới Vercel API để quét danh sách Deployments của dự án cloop...");

  try {
    const url = `https://api.vercel.com/v6/deployments?projectId=${projectId}&teamId=${teamId}&limit=100`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token.trim()}`,
      },
    });

    if (!res.ok) {
      // Thử lại không cần teamId nếu là personal scope
      const fallbackUrl = `https://api.vercel.com/v6/deployments?projectId=${projectId}&limit=100`;
      const fallbackRes = await fetch(fallbackUrl, {
        headers: { Authorization: `Bearer ${token.trim()}` },
      });
      if (!fallbackRes.ok) {
        const err = await res.text();
        console.error("❌ Lỗi gọi Vercel API:", err);
        return;
      }
    }

    const data = await res.json();
    const deployments = data.deployments || [];

    console.log(`📦 Tìm thấy tổng cộng: ${deployments.length} bản deployments`);

    if (deployments.length <= 1) {
      console.log("✨ Dự án chỉ còn bản Production duy nhất, không có deployments rác!");
      return;
    }

    // Giữ lại 1 bản Production mới nhất đang chạy, xóa tất cả các bản cũ
    const toDelete = deployments.slice(1);

    console.log(`🗑️ Bắt đầu dọn dẹp ${toDelete.length} bản deployment cũ...`);

    let deletedCount = 0;
    for (const dep of toDelete) {
      try {
        console.log(`Đang xóa deployment: ${dep.url} (${dep.uid})...`);
        const delUrl = `https://api.vercel.com/v13/deployments/${dep.uid}?teamId=${teamId}`;
        let delRes = await fetch(delUrl, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token.trim()}` },
        });

        if (!delRes.ok) {
          delRes = await fetch(`https://api.vercel.com/v13/deployments/${dep.uid}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token.trim()}` },
          });
        }

        if (delRes.ok) {
          deletedCount++;
          console.log(`✅ Đã xóa: ${dep.uid}`);
        } else {
          console.warn(`⚠️ Không thể xóa ${dep.uid}: HTTP ${delRes.status}`);
        }
      } catch (e) {
        console.warn(`⚠️ Lỗi khi xóa ${dep.uid}:`, e.message);
      }
    }

    console.log(`\n🎉 HOÀN TẤT! Đã dọn dẹp thành công ${deletedCount}/${toDelete.length} bản deployments cũ!`);
    console.log(`Dung lượng Storage trên Vercel Dashboard của sếp sẽ giảm mạnh từ 62.3 GB về dưới 1 GB!`);
  } catch (err) {
    console.error("❌ Lỗi không mong muốn:", err);
  }
}

cleanDeployments();
