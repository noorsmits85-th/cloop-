import { requireAdminOrRedirect } from "@/src/lib/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // LỚP BẢO VỆ CHẶN TỪ XA: Bất kỳ ai không phải ADMIN sẽ bị đá về trang chủ ngay lập tức.
  await requireAdminOrRedirect();

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Sidebar hoặc Admin Header nếu muốn thêm sau này */}
      <div className="max-w-[1500px] mx-auto">
        {children}
      </div>
    </div>
  );
}
