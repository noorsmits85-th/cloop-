"use client";

import React, { useState } from "react";
import { Save, MapPin, CreditCard, Store } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export function SettingsClient({ userProfile }: { userProfile: any }) {
  const [address, setAddress] = useState(userProfile?.pickup_address || "");
  const [phone, setPhone] = useState(userProfile?.phone || "");
  const [bankName, setBankName] = useState(userProfile?.bank_name || "");
  const [bankAccount, setBankAccount] = useState(userProfile?.bank_account || "");
  const [isSaving, setIsSaving] = useState(false);
  const router = useRouter();

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) throw new Error("Chưa đăng nhập");

      const { error } = await supabase
        .from("users")
        .update({
          pickup_address: address,
          phone: phone,
          bank_name: bankName,
          bank_account: bankAccount
        })
        .eq("id", session.user.id);
      
      if (error) throw error;
      alert("Đã lưu thông tin cài đặt thành công!");
      router.refresh();
    } catch (err: any) {
      alert("Lỗi lưu thông tin: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-6">
      {/* KHO LẤY HÀNG */}
      <div className="bg-white rounded-2xl border border-stone-200/60 shadow-sm overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-stone-100 bg-stone-50/50 flex items-center gap-2 text-stone-800">
          <Store size={18} />
          <h3 className="font-bold text-sm uppercase tracking-wider">Thông tin Cửa hàng / Kho đồ</h3>
        </div>
        
        <div className="p-6 space-y-4">
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-stone-500 uppercase tracking-wider">Số điện thoại liên hệ</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="VD: 0901234567"
              className="w-full px-4 py-3 rounded-xl border border-stone-200 text-sm focus:outline-none focus:border-[#183A2D] bg-white transition-colors"
            />
          </div>
          
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-stone-500 uppercase tracking-wider">Địa chỉ lấy hàng (Dành cho Shipper)</label>
            <div className="relative">
              <div className="absolute left-4 top-3.5 text-stone-400">
                <MapPin size={16} />
              </div>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Số nhà, Tên đường, Phường/Xã, Quận/Huyện, TP..."
                className="w-full pl-11 pr-4 py-3 rounded-xl border border-stone-200 text-sm focus:outline-none focus:border-[#183A2D] bg-white transition-colors"
              />
            </div>
            <p className="text-[10px] text-stone-400 mt-1">Shipper của CLOOP sẽ đến địa chỉ này để lấy đồ khi có đơn thuê/mua.</p>
          </div>
        </div>
      </div>

      {/* TÀI KHOẢN NGÂN HÀNG */}
      <div className="bg-white rounded-2xl border border-stone-200/60 shadow-sm overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-stone-100 bg-stone-50/50 flex items-center gap-2 text-stone-800">
          <CreditCard size={18} />
          <h3 className="font-bold text-sm uppercase tracking-wider">Tài khoản ngân hàng nhận tiền</h3>
        </div>
        
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-stone-500 uppercase tracking-wider">Tên Ngân hàng</label>
              <input
                type="text"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="VD: Vietcombank, Techcombank..."
                className="w-full px-4 py-3 rounded-xl border border-stone-200 text-sm focus:outline-none focus:border-[#183A2D] bg-white transition-colors uppercase"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-stone-500 uppercase tracking-wider">Số Tài khoản</label>
              <input
                type="text"
                value={bankAccount}
                onChange={(e) => setBankAccount(e.target.value)}
                placeholder="Nhập chính xác số tài khoản..."
                className="w-full px-4 py-3 rounded-xl border border-stone-200 text-sm focus:outline-none focus:border-[#183A2D] bg-white transition-colors font-mono"
              />
            </div>
          </div>
          <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 text-[11px] text-amber-800">
            <strong>Lưu ý:</strong> Tiền cọc và doanh thu từ việc cho thuê/bán thanh lý sẽ được rút trực tiếp về tài khoản này. Vui lòng đảm bảo thông tin chính xác.
          </div>
        </div>
      </div>

      {/* SUBMIT */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSaving}
          className="px-8 py-3.5 bg-[#183A2D] text-white text-xs font-bold uppercase tracking-widest rounded-xl shadow-md transition-all flex items-center gap-2 hover:bg-[#23452F] disabled:opacity-50"
        >
          <Save size={16} /> {isSaving ? "Đang lưu..." : "Lưu thay đổi"}
        </button>
      </div>
    </div>
  );
}
