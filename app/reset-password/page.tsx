"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/src/utils/supabase/client";
import { Loader2, LockKeyhole } from "lucide-react";

const MIN_PASSWORD_LENGTH = 8;

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = createClient();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage(null);

    if (password.length < MIN_PASSWORD_LENGTH) {
      setMessage({ type: "error", text: `Mat khau phai co it nhat ${MIN_PASSWORD_LENGTH} ky tu.` });
      return;
    }

    if (password !== confirmPassword) {
      setMessage({ type: "error", text: "Mat khau xac nhan khong khop." });
      return;
    }

    setLoading(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        setMessage({
          type: "error",
          text: "Lien ket khoi phuc khong hop le hoac da het han. Vui long yeu cau link moi.",
        });
        return;
      }

      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setMessage({ type: "error", text: error.message });
        return;
      }

      await supabase.auth.signOut();
      setMessage({ type: "success", text: "Da doi mat khau thanh cong. Dang chuyen ve trang dang nhap..." });
      window.setTimeout(() => router.push("/login"), 1200);
    } catch (error: unknown) {
      // TODO: Tich hop Sentry/LogRocket de theo doi loi reset password tren production.
      const errorMessage = error instanceof Error ? error.message : "He thong gap su co, vui long thu lai.";
      setMessage({ type: "error", text: errorMessage });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#FAF9F6] px-4 py-16 text-[#183A2D]">
      <section className="mx-auto w-full max-w-md rounded-2xl border border-[#E9E2D8] bg-white p-8 shadow-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
            <LockKeyhole size={22} />
          </div>
          <h1 className="text-2xl font-bold">Dat lai mat khau</h1>
          <p className="mt-2 text-sm text-stone-500">Nhap mat khau moi cho tai khoan CLOOP cua ban.</p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider text-stone-500">Mat khau moi</label>
            <input
              type="password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-[#E9E2D8] bg-[#FAF8F3] px-4 py-3 text-sm outline-none focus:border-[#183A2D]"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider text-stone-500">Xac nhan mat khau</label>
            <input
              type="password"
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-xl border border-[#E9E2D8] bg-[#FAF8F3] px-4 py-3 text-sm outline-none focus:border-[#183A2D]"
            />
          </div>

          {message && (
            <p
              className={`rounded-xl px-4 py-3 text-sm ${
                message.type === "error" ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"
              }`}
            >
              {message.text}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-[#183A2D] px-4 py-3 text-sm font-bold uppercase tracking-widest text-white transition hover:bg-[#254F3B] disabled:opacity-60"
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            Doi mat khau
          </button>
        </form>
      </section>
    </main>
  );
}
