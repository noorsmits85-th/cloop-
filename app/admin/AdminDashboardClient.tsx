"use client";

import { useState } from 'react';
import { Search, Coins, Zap, AlertTriangle, User as UserIcon, CheckCircle2, Loader2 } from 'lucide-react';
import { searchUserByEmail, pumpCoins } from '@/app/actions/admin';

export default function AdminDashboardClient({ currentAdmin }: { currentAdmin: any }) {
  const [email, setEmail] = useState('');
  const [targetUser, setTargetUser] = useState<any>(null);
  const [amount, setAmount] = useState<number>(1000);
  
  const [isSearching, setIsSearching] = useState(false);
  const [isPumping, setIsPumping] = useState(false);
  const [message, setMessage] = useState<{ type: 'error'|'success', text: string } | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSearching(true);
    setMessage(null);
    setTargetUser(null);
    
    const res = await searchUserByEmail(email);
    if (res.error) {
      setMessage({ type: 'error', text: res.error });
    } else if (res.user) {
      setTargetUser(res.user);
    }
    setIsSearching(false);
  };

  const handlePump = async () => {
    if (!targetUser) return;
    
    setIsPumping(true);
    setMessage(null);
    
    const res = await pumpCoins(targetUser.id, amount);
    if (res.error) {
      setMessage({ type: 'error', text: res.error });
    } else {
      setMessage({ type: 'success', text: res.message || 'Thành công' });
      // Update local state to reflect new coins
      setTargetUser({ ...targetUser, cloopCoins: targetUser.cloopLeaves + amount });
    }
    
    setIsPumping(false);
  };

  return (
    <div className="max-w-4xl mx-auto px-4">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-heading font-bold text-white flex items-center gap-2">
            <Zap className="text-yellow-400 fill-yellow-400" /> Cloop God Mode
          </h1>
          <p className="text-slate-400 font-body text-sm mt-1">
            Chào mừng Admin: <span className="text-emerald-400 font-mono">{currentAdmin.name}</span>
          </p>
        </div>
        <div className="bg-slate-800 border border-slate-700 px-4 py-2 rounded-xl flex items-center gap-2 shadow-inner">
          <img src="/images/cloop-coin-front.png" className="w-5 h-5" alt="coin" />
          <span className="font-mono font-bold text-yellow-400">{currentAdmin.coins.toLocaleString()}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column: Search */}
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-xl">
          <h2 className="text-lg font-heading font-bold text-white mb-4 flex items-center gap-2">
            <Search size={18} className="text-emerald-400" />
            Tìm Kiếm Tài Khoản
          </h2>
          
          <form onSubmit={handleSearch} className="flex gap-2">
            <input 
              type="email" 
              placeholder="Nhập email user cần bơm xu..." 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-white font-body focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
              required
            />
            <button 
              type="submit" 
              disabled={isSearching}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl font-bold transition-colors disabled:opacity-50"
            >
              {isSearching ? <Loader2 className="animate-spin" /> : 'Tìm'}
            </button>
          </form>

          {message && message.type === 'error' && (
            <div className="mt-4 bg-red-900/50 border border-red-800 text-red-200 px-4 py-3 rounded-xl text-sm flex items-start gap-2">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              <p>{message.text}</p>
            </div>
          )}
        </div>

        {/* Right Column: Pump Control */}
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-xl relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute top-0 right-0 -mr-16 -mt-16 text-slate-700/30">
            <Coins size={200} />
          </div>

          <h2 className="text-lg font-heading font-bold text-white mb-4 flex items-center gap-2 relative z-10">
            <Coins size={18} className="text-yellow-400" />
            Bảng Điều Khiển "Bơm Xu"
          </h2>

          {!targetUser ? (
            <div className="h-40 flex flex-col items-center justify-center text-slate-500 relative z-10">
              <UserIcon size={32} className="mb-2 opacity-50" />
              <p className="text-sm">Hãy tìm một người dùng trước.</p>
            </div>
          ) : (
            <div className="relative z-10">
              {/* User Info Card */}
              <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 mb-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center overflow-hidden shrink-0">
                  {targetUser.avatar ? (
                    <img src={targetUser.avatar} alt="avatar" className="w-full h-full object-cover" />
                  ) : (
                    <UserIcon className="text-slate-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-bold truncate">{targetUser.name || 'Chưa cập nhật tên'}</h3>
                  <p className="text-slate-400 text-xs truncate">{targetUser.email}</p>
                </div>
                <div className="bg-slate-800 px-3 py-1.5 rounded-lg flex items-center gap-1.5 border border-slate-700">
                  <img src="/images/cloop-coin-front.png" className="w-4 h-4" alt="coin" />
                  <span className="text-yellow-400 font-mono font-bold text-sm">
                    {targetUser.cloopLeaves.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Pump Action */}
              <div className="space-y-3">
                <label className="text-sm text-slate-400 font-bold block">Số lượng xu cần bơm:</label>
                <div className="flex gap-2">
                  <input 
                    type="number" 
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="w-32 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-yellow-400 font-mono font-bold text-lg focus:outline-none focus:border-yellow-500 transition-all"
                    min="1"
                  />
                  <div className="flex gap-1">
                    {[100, 1000, 5000].map(val => (
                      <button 
                        key={val}
                        onClick={() => setAmount(val)}
                        className="bg-slate-700 hover:bg-slate-600 text-slate-200 px-3 py-2 rounded-xl text-xs font-mono transition-colors"
                      >
                        +{val}
                      </button>
                    ))}
                  </div>
                </div>

                <button 
                  onClick={handlePump}
                  disabled={isPumping || amount <= 0}
                  className="w-full mt-4 bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 text-black font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(234,179,8,0.3)]"
                >
                  {isPumping ? <Loader2 className="animate-spin" /> : (
                    <>
                      <Zap size={18} className="fill-black" />
                      BƠM NGAY LẬP TỨC
                    </>
                  )}
                </button>

                {message && message.type === 'success' && (
                  <div className="mt-4 bg-emerald-900/50 border border-emerald-800 text-emerald-200 px-4 py-3 rounded-xl text-sm flex items-start gap-2">
                    <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
                    <p>{message.text}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
