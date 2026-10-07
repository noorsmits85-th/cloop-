import { requireAdminOrRedirect } from "@/src/lib/auth";
import AdminNavbar from "./AdminNavbar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // LỚP BẢO VỆ CHẶN TỪ XA: Bất kỳ ai không phải ADMIN sẽ bị đá về trang chủ ngay lập tức.
  await requireAdminOrRedirect();

  return (
    <div className="min-h-screen bg-[#FAF9F5]">
      {/* THANH ĐIỀU HƯỚNG MẠCH DÒNG TIỀN VẬN HÀNH THỐNG NHẤT TOÀN SÀN */}
      <AdminNavbar />
      <div className="w-full px-4 lg:px-6 py-6">
        <div className="max-w-[1280px] mx-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
