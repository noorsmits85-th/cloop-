"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, BarChart, Bar, Legend, PieChart, Pie, Cell } from "recharts";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

const revenueData = [
  { name: 'T2', rent: 4000, sell: 2400 },
  { name: 'T3', rent: 3000, sell: 1398 },
  { name: 'T4', rent: 2000, sell: 9800 },
  { name: 'T5', rent: 2780, sell: 3908 },
  { name: 'T6', rent: 1890, sell: 4800 },
  { name: 'T7', rent: 2390, sell: 3800 },
  { name: 'CN', rent: 3490, sell: 4300 },
];

const categoryData = [
  { name: 'Áo khoác', value: 400 },
  { name: 'Đầm dạ hội', value: 300 },
  { name: 'Túi xách', value: 300 },
  { name: 'Phụ kiện', value: 200 },
];

const COLORS = ['#183A2D', '#D9C8A9', '#4A675B', '#E5DFD3'];

export function DashboardCharts({ 
  revenueData, 
  categoryData, 
  totalProducts 
}: { 
  revenueData: any[]; 
  categoryData: any[]; 
  totalProducts: number;
}) {
  const maxRevenue = Math.max(...revenueData.map(d => Math.max(d.rent, d.sell)));
  const isRevenueEmpty = maxRevenue === 0;

  const formatYAxis = (value: number) => {
    if (value === 0) return '0đ';
    if (value >= 1000000) return `${(value / 1000000).toFixed(1).replace('.0', '')}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
    return `${value}đ`;
  };
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
      {/* Biểu đồ doanh thu - Area Chart */}
      <div className="bg-white p-6 rounded-2xl border border-stone-200/60 shadow-sm lg:col-span-2 hover:shadow-md transition-shadow">
        <div className="mb-4">
          <h3 className="font-bold text-[#183A2D] text-base">Thống kê doanh thu tuần</h3>
          <p className="text-xs text-stone-500">So sánh doanh thu từ việc cho thuê và bán lại</p>
        </div>
        <div className="h-[250px] w-full relative">
          {isRevenueEmpty ? (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-white rounded-2xl"
            >
              <div className="flex flex-col items-center text-center space-y-4">
                <motion.div 
                  animate={{ 
                    y: [-10, 5, -10],
                    rotate: [-10, 10, -10],
                    scale: [1, 1.15, 1],
                    boxShadow: ["0px 0px 0px rgba(245,158,11,0)", "0px 0px 20px rgba(245,158,11,0.4)", "0px 0px 0px rgba(245,158,11,0)"]
                  }}
                  transition={{ 
                    duration: 2.5, 
                    repeat: Infinity, 
                    ease: "easeInOut" 
                  }}
                  className="w-16 h-16 bg-gradient-to-tr from-amber-100 to-yellow-50 text-amber-500 rounded-full flex items-center justify-center border border-amber-200 shadow-sm relative"
                >
                  <Sparkles size={28} strokeWidth={2} />
                  {/* Small floating sparkles */}
                  <motion.div
                    animate={{ scale: [1, 0, 1], opacity: [1, 0, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full blur-[1px]"
                  />
                  <motion.div
                    animate={{ scale: [0, 1, 0], opacity: [0, 1, 0] }}
                    transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                    className="absolute -bottom-1 -left-1 w-2 h-2 bg-amber-400 rounded-full blur-[1px]"
                  />
                </motion.div>
                <div>
                  <h4 className="text-[15px] font-bold text-[#183A2D]">Mở bát tủ đồ, "nhả vía" chốt đơn!</h4>
                  <p className="text-xs text-stone-500 mt-1.5 max-w-[260px] mx-auto">Giao diện này đang thiếu vài chiếc ảnh xinh xỉu để kích hoạt dòng tiền. Đăng đồ ngay để rinh lộc rủng rỉnh nào bồ ơi!</p>
                </div>
                <motion.a 
                  href="/my-closet/create" 
                  animate={{
                    boxShadow: ["0px 4px 6px -1px rgba(24,58,45,0.1)", "0px 0px 15px rgba(24,58,45,0.5)", "0px 4px 6px -1px rgba(24,58,45,0.1)"]
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="relative overflow-hidden px-6 py-3 bg-[#183A2D] text-white text-[13px] font-bold rounded-full shadow-md transition-all group"
                >
                  <span className="relative z-10">+ Kích hoạt tủ đồ</span>
                  {/* Shimmer effect */}
                  <motion.div 
                    initial={{ x: "-100%" }}
                    animate={{ x: "200%" }}
                    transition={{
                      repeat: Infinity,
                      duration: 2.5,
                      ease: "linear",
                      repeatDelay: 1
                    }}
                    className="absolute inset-0 z-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-[-20deg]"
                  />
                </motion.a>
              </div>
            </motion.div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#183A2D" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#183A2D" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorSell" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#D9C8A9" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#D9C8A9" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#78716c' }} dy={10} />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: '#78716c' }} 
                  tickFormatter={formatYAxis}
                  domain={isRevenueEmpty ? [0, 1000000] : ['auto', 'auto']}
                />
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e5e5" />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  labelStyle={{ fontWeight: 'bold', color: '#183A2D' }}
                  formatter={(value: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value)}
                />
                <Area type="monotone" dataKey="sell" name="Bán" stroke="#D9C8A9" fillOpacity={1} fill="url(#colorSell)" />
                <Area type="monotone" dataKey="rent" name="Cho thuê" stroke="#183A2D" strokeWidth={2} fillOpacity={1} fill="url(#colorRent)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Biểu đồ phân bổ - Pie Chart */}
      <div className="bg-white p-6 rounded-2xl border border-stone-200/60 shadow-sm hover:shadow-md transition-shadow flex flex-col">
        <div className="mb-2">
          <h3 className="font-bold text-[#183A2D] text-base">Phân bổ danh mục</h3>
          <p className="text-xs text-stone-500">Tỷ trọng các nhóm đồ trong tủ</p>
        </div>
        <div className="flex-1 min-h-[250px] w-full flex items-center justify-center relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={categoryData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
                stroke="none"
              >
                {categoryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
            </PieChart>
          </ResponsiveContainer>
          {/* Custom Legend */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <span className="block text-2xl font-black text-[#183A2D]">{totalProducts > 1000 ? (totalProducts / 1000).toFixed(1) + 'k' : totalProducts}</span>
              <span className="block text-[10px] uppercase font-bold text-stone-400">Sản phẩm</span>
            </div>
          </div>
        </div>
        
        {/* Simple Legend Below */}
        <div className="grid grid-cols-2 gap-2 mt-4">
          {categoryData.map((item, index) => (
            <div key={item.name} className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
              <span className="text-xs font-medium text-stone-600 truncate">{item.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
