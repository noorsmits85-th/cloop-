const fs = require('fs');

let content = fs.readFileSync('app/(dashboard)/my-closet/page.tsx', 'utf8');

// 1. Replace Row 1: KPI Cards
const oldCardsTarget = `{/* GREEN IMPACT ESG DASHBOARD & COIN BALANCE */}`;
const endOfCardsTarget = `{/* Charts Section */}`;
const oldCardsRegex = new RegExp(oldCardsTarget.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[\\s\\S]*?(?=' + endOfCardsTarget.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')');

const newCards = `{/* GREEN IMPACT ESG DASHBOARD & COIN BALANCE */}\n` +
`        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
          {/* Thẻ 1: Ví Lá CLOOP */}
          <div className="bg-white border border-stone-200/50 p-5 rounded-2xl shadow-sm flex flex-col gap-2 relative overflow-hidden group hover:-translate-y-1 hover:shadow-lg transition-all duration-300 cursor-pointer">
            <div className="absolute -right-6 -bottom-6 w-24 h-24 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
              <img src="/images/cloop-coin-tilt.png" alt="Coin bg" className="w-full h-full object-contain mix-blend-multiply" />
            </div>
            <div className="flex justify-between items-start z-10">
              <div className="w-10 h-10 rounded-full bg-stone-50 flex items-center justify-center border border-stone-100 p-1.5">
                <img src="/images/cloop-coin-front.png" alt="Lá CLOOP" className="w-full h-full object-contain drop-shadow-sm mix-blend-multiply" />
              </div>
            </div>
            <div className="z-10 mt-1">
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Tài khoản Lá CLOOP</div>
              <div className="text-2xl font-mono font-black text-[#183A2D]">{cloopCoins.toLocaleString()} <span className="text-xs font-bold">Lá</span></div>
              <p className="text-[11px] text-[#183A2D] font-medium mt-1">Sẵn sàng quảng cáo tủ đồ</p>
            </div>
          </div>

          {/* Thẻ 2: Tác Động Sinh Thái */}
          <div className="bg-[#183A2D] text-white p-5 rounded-2xl shadow-sm flex flex-col gap-2 relative overflow-hidden group hover:-translate-y-1 hover:shadow-xl hover:shadow-[#183A2D]/20 transition-all duration-300">
            <div className="absolute -right-4 -top-4 text-white/10 group-hover:scale-110 transition-transform duration-500">
              <Leaf size={100} />
            </div>
            <div className="flex justify-between items-start z-10">
              <div className="w-10 h-10 rounded-full bg-white/20 text-white flex items-center justify-center backdrop-blur-sm">
                <Sparkles size={18} />
              </div>
              <span className="text-[10px] font-bold text-emerald-200 bg-white/10 px-2 py-1 rounded-full border border-white/20 backdrop-blur-md">
                Eco Warrior
              </span>
            </div>
            <div className="z-10 mt-1">
              <div className="text-xs font-bold text-white/70 uppercase tracking-wider">Tác động sinh thái</div>
              <div className="text-2xl font-mono font-black">{ecoStats.greenPoints.toLocaleString()} <span className="text-xs font-normal">Pts</span></div>
              <p className="text-[11px] text-emerald-200 mt-1">Đã giảm {ecoStats.co2Saved.toLocaleString()}kg CO₂</p>
            </div>
          </div>

          {/* Thẻ 3: Uy Tín */}
          <div className="bg-white border border-stone-200/50 p-5 rounded-2xl shadow-sm flex flex-col gap-2 relative group hover:-translate-y-1 hover:shadow-lg transition-all duration-300">
            <div className="flex justify-between items-start">
              <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
                <Star size={18} className="fill-amber-500 text-amber-500" />
              </div>
              <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded-full border border-amber-200 flex items-center gap-1">
                <ShieldCheck size={12} /> Trustworthy
              </span>
            </div>
            <div className="mt-1">
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Chỉ số uy tín</div>
              <div className="text-2xl font-mono font-black text-stone-900">5.0 <span className="text-xs font-normal text-stone-500">/ 5.0</span></div>
              <p className="text-[11px] text-amber-700 font-medium mt-1">100% đánh giá tích cực</p>
            </div>
          </div>

          {/* Thẻ 4: Hiệu Suất */}
          <div className="bg-white border border-stone-200/50 p-5 rounded-2xl shadow-sm flex flex-col gap-2 relative group hover:-translate-y-1 hover:shadow-lg transition-all duration-300">
            <div className="flex justify-between items-start">
              <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                <TrendingUp size={18} />
              </div>
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full flex items-center gap-1">
                <TrendingUp size={12} /> +12%
              </span>
            </div>
            <div className="mt-1">
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Hiệu suất tháng này</div>
              <div className="text-2xl font-mono font-black text-stone-900">1,250,000₫</div>
              <p className="text-[11px] text-blue-700 font-medium mt-1">{closetItems.length} sản phẩm đang niêm yết</p>
            </div>
          </div>
        </div>\n\n        `;

content = content.replace(oldCardsRegex, newCards);

// 2. Replace Row 3: Data Table
const dataTableTarget = `{/* CẤU TRÚC 3 TAB QUẢN LÝ MASTER */}`;
const dataTableRegex = new RegExp(dataTableTarget.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[\\s\\S]*?(?=<AnimatePresence>)');

const newDataTable = `{/* CẤU TRÚC 3 TAB QUẢN LÝ MASTER (DATAGRID SAAS) */}
        <div className="bg-white rounded-2xl border border-stone-200/60 shadow-sm overflow-hidden flex flex-col mt-4">
          <div className="flex border-b border-stone-100 w-full px-2 pt-2 overflow-x-auto no-scrollbar bg-stone-50/50">
            <button 
              onClick={() => setActiveTab("ITEMS")} 
              className={\`px-4 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer \${activeTab === "ITEMS" ? "border-transparent text-[#183A2D] border-b-2 !border-[#183A2D] bg-white rounded-t-lg" : "border-transparent text-stone-400 hover:text-stone-700"}\`}
            >
              <Shirt size={16} /> Kho sản phẩm
              <span className={\`ml-1 px-1.5 py-0.5 rounded-md text-[10px] \${activeTab === "ITEMS" ? "bg-[#183A2D]/10 text-[#183A2D]" : "bg-stone-100"}\`}>{closetItems.length}</span>
            </button>
            <button 
              onClick={() => setActiveTab("ESCROW")} 
              className={\`px-4 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer \${activeTab === "ESCROW" ? "border-transparent text-amber-800 border-b-2 !border-amber-800 bg-white rounded-t-lg" : "border-transparent text-stone-400 hover:text-stone-700"}\`}
            >
              <History size={16} /> Yêu cầu ký quỹ
              <span className={\`ml-1 px-1.5 py-0.5 rounded-md text-[10px] \${activeTab === "ESCROW" ? "bg-amber-100 text-amber-800" : "bg-stone-100"}\`}>{escrowOrders.length}</span>
            </button>
            <button 
              onClick={() => setActiveTab("RENTED")} 
              className={\`px-4 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer \${activeTab === "RENTED" ? "border-transparent text-[#0ea5e9] border-b-2 !border-[#0ea5e9] bg-white rounded-t-lg" : "border-transparent text-stone-400 hover:text-stone-700"}\`}
            >
              <ShoppingBag size={16} /> Trang phục đi thuê
              <span className={\`ml-1 px-1.5 py-0.5 rounded-md text-[10px] \${activeTab === "RENTED" ? "bg-blue-50 text-blue-700" : "bg-stone-100"}\`}>{rentedOrders.length}</span>
            </button>
          </div>

          <div className="p-0">
            {activeTab === "ITEMS" && (
              <div>
                {closetItems.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                      <thead>
                        <tr className="border-b border-stone-100 bg-stone-50/30 text-stone-400 font-bold text-[10px] uppercase tracking-wider">
                          <th className="py-4 px-6 w-16">Sản phẩm</th>
                          <th className="py-4 px-6">Trạng thái</th>
                          <th className="py-4 px-6 text-emerald-800">Blog Lookbook</th>
                          <th className="py-4 px-6 text-right text-emerald-800">Giá Thuê</th>
                          <th className="py-4 px-6 text-right text-blue-800">Giá Bán</th>
                          <th className="py-4 px-6 text-right">Hành động</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100 font-medium text-stone-600 text-[13px]">
                        {closetItems.map((item) => (
                          <tr key={item.id} className="hover:bg-stone-50/50 transition-colors group">
                            <td className="py-3 px-6">
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-16 rounded-lg bg-stone-100 overflow-hidden shrink-0 border border-stone-200/50">
                                  <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                                </div>
                                <div className="flex flex-col max-w-[200px]">
                                  <span className="font-bold text-[#183A2D] truncate">{item.name}</span>
                                  <span className="text-[11px] text-stone-400">Size {item.size}</span>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-6">
                              <div className="flex flex-col gap-1.5">
                                {item.isRentalActive ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 w-fit">
                                    <CheckCircle2 size={10} /> Cho Thuê
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-500 w-fit">Không cho thuê</span>
                                )}
                                {item.isSaleActive ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100 w-fit">
                                    <CheckCircle2 size={10} /> Bán Thanh Lý
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-500 w-fit">Không bán</span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-6">
                              <div className="flex flex-col gap-1 max-w-[150px]">
                                <span className="truncate text-xs font-semibold text-stone-700">{item.blogTitle}</span>
                                <span className={\`text-[10px] font-bold \${item.hasBlog ? (item.isBlogHidden ? 'text-amber-600' : 'text-emerald-600') : 'text-stone-400'}\`}>
                                  {item.hasBlog ? (item.isBlogHidden ? 'Đã Ẩn' : 'Đang Hiển Thị') : 'Chưa có bài'}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-6 text-right font-mono font-bold text-emerald-700">
                              {item.isRentalActive ? \`\${item.rentalPrice.toLocaleString()}₫\` : '-'}
                            </td>
                            <td className="py-3 px-6 text-right font-mono font-bold text-blue-700">
                              {item.isSaleActive ? \`\${item.salePrice.toLocaleString()}₫\` : '-'}
                            </td>
                            <td className="py-3 px-6 text-right">
                              <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button className="p-1.5 text-stone-400 hover:text-[#183A2D] hover:bg-stone-100 rounded-lg transition-colors" title="Chỉnh sửa">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                                </button>
                                {item.hasBlog && (
                                  <button onClick={() => handleToggleBlogVisibility(item.id, item.isBlogHidden)} className={\`p-1.5 rounded-lg transition-colors \${item.isBlogHidden ? 'text-amber-500 hover:bg-amber-50' : 'text-emerald-500 hover:bg-emerald-50'}\`} title={item.isBlogHidden ? 'Hiện Blog' : 'Ẩn Blog'}>
                                    {item.isBlogHidden ? <EyeOff size={16} /> : <Eye size={16} />}
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                    <div className="w-20 h-20 bg-stone-100 rounded-full flex items-center justify-center text-stone-300 mb-4">
                      <Shirt size={32} />
                    </div>
                    <h3 className="text-lg font-bold text-stone-800 mb-2">Tủ đồ trống</h3>
                    <p className="text-sm text-stone-500 max-w-sm mb-6">Bạn chưa có sản phẩm nào đang niêm yết. Hãy đăng đồ lên CLOOP ngay để bắt đầu cho thuê và bán thanh lý nhé!</p>
                    <Link href="/my-closet/create" className="inline-flex items-center gap-2 bg-[#183A2D] text-white px-6 py-2.5 rounded-full text-sm font-bold hover:bg-[#112a20] transition-colors shadow-sm hover:shadow-md hover:-translate-y-0.5">
                      <Plus size={16} /> Đăng bán ngay
                    </Link>
                  </div>
                )}
              </div>
            )}

            {activeTab === "ESCROW" && (
              <div>
                {escrowOrders.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                      <thead>
                        <tr className="border-b border-stone-100 bg-stone-50/30 text-stone-400 font-bold text-[10px] uppercase tracking-wider">
                          <th className="py-4 px-6">Mã Giao Dịch</th>
                          <th className="py-4 px-6">Sản Phẩm</th>
                          <th className="py-4 px-6">Khách Thuê</th>
                          <th className="py-4 px-6">Trạng Thái</th>
                          <th className="py-4 px-6 text-right">Tổng Tiền Ký Quỹ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100 font-medium text-stone-600 text-[13px]">
                        {escrowOrders.map((order) => (
                          <tr key={order.id} className="hover:bg-stone-50/50 transition-colors">
                            <td className="py-3 px-6 font-mono text-xs text-stone-500">#{String(order.id).padStart(5, '0')}</td>
                            <td className="py-3 px-6">
                              <div className="flex items-center gap-3">
                                <img src={order.products?.image_url || PLACEHOLDER_IMG} className="w-8 h-10 rounded-md object-cover bg-stone-100 border border-stone-200" />
                                <span className="font-bold text-[#183A2D] truncate max-w-[150px]">{order.products?.title || 'Trang phục CLOOP'}</span>
                              </div>
                            </td>
                            <td className="py-3 px-6">
                              <div className="flex flex-col">
                                <span className="font-bold text-stone-800 text-xs">ID Khách: {order.renterId?.substring(0,8)}</span>
                                <span className="text-[10px] text-amber-600 font-bold flex items-center gap-0.5"><Star size={10} className="fill-amber-500" /> {order.renterAvg} ({order.renterReviewCount} đánh giá)</span>
                              </div>
                            </td>
                            <td className="py-3 px-6">
                              {order.status === "active" && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">Đang thuê</span>}
                              {order.status === "completed" && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-500">Đã hoàn tất</span>}
                              {order.status === "returning" && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100 animate-pulse">Khách đang trả đồ</span>}
                            </td>
                            <td className="py-3 px-6 text-right font-mono font-bold text-[#183A2D]">
                              {(order.total_amount || 0).toLocaleString()}₫
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                    <div className="w-20 h-20 bg-stone-100 rounded-full flex items-center justify-center text-stone-300 mb-4">
                      <History size={32} />
                    </div>
                    <h3 className="text-lg font-bold text-stone-800 mb-2">Chưa có giao dịch ký quỹ</h3>
                    <p className="text-sm text-stone-500 max-w-sm">Tủ đồ của bạn hiện chưa có yêu cầu thuê nào từ người dùng khác.</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === "RENTED" && (
              <div>
                {rentedOrders.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                      <thead>
                        <tr className="border-b border-stone-100 bg-stone-50/30 text-stone-400 font-bold text-[10px] uppercase tracking-wider">
                          <th className="py-4 px-6">Mã Giao Dịch</th>
                          <th className="py-4 px-6">Sản Phẩm</th>
                          <th className="py-4 px-6">Chủ Đồ</th>
                          <th className="py-4 px-6">Trạng Thái</th>
                          <th className="py-4 px-6 text-right">Tổng Tiền Thanh Toán</th>
                          <th className="py-4 px-6 text-right">Đánh giá</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100 font-medium text-stone-600 text-[13px]">
                        {rentedOrders.map((order) => (
                          <tr key={order.id} className="hover:bg-stone-50/50 transition-colors group">
                            <td className="py-3 px-6 font-mono text-xs text-stone-500">#{String(order.id).padStart(5, '0')}</td>
                            <td className="py-3 px-6">
                              <div className="flex items-center gap-3">
                                <img src={order.products?.image_url || PLACEHOLDER_IMG} className="w-8 h-10 rounded-md object-cover bg-stone-100 border border-stone-200" />
                                <span className="font-bold text-[#183A2D] truncate max-w-[150px]">{order.products?.title || 'Trang phục CLOOP'}</span>
                              </div>
                            </td>
                            <td className="py-3 px-6">
                              <div className="flex flex-col">
                                <span className="font-bold text-stone-800 text-xs">ID Chủ: {order.ownerId?.substring(0,8)}</span>
                                <span className="text-[10px] text-amber-600 font-bold flex items-center gap-0.5"><Star size={10} className="fill-amber-500" /> {order.ownerAvg} ({order.ownerReviewCount} đánh giá)</span>
                              </div>
                            </td>
                            <td className="py-3 px-6">
                              {order.status === "active" && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">Đang thuê</span>}
                              {order.status === "completed" && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-500">Đã hoàn tất</span>}
                              {order.status === "returning" && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100">Đang trả đồ</span>}
                            </td>
                            <td className="py-3 px-6 text-right font-mono font-bold text-[#0ea5e9]">
                              {(order.total_amount || 0).toLocaleString()}₫
                            </td>
                            <td className="py-3 px-6 text-right">
                              {order.status === "completed" ? (
                                <button onClick={() => {
                                  setSelectedOrderForReview(order);
                                  setShowReviewModal(true);
                                }} className="text-[10px] font-bold text-[#183A2D] bg-[#183A2D]/10 hover:bg-[#183A2D] hover:text-white px-3 py-1.5 rounded-md transition-colors">
                                  Đánh giá
                                </button>
                              ) : (
                                <span className="text-[10px] text-stone-400">Chưa thể đánh giá</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                    <div className="w-20 h-20 bg-stone-100 rounded-full flex items-center justify-center text-stone-300 mb-4">
                      <ShoppingBag size={32} />
                    </div>
                    <h3 className="text-lg font-bold text-stone-800 mb-2">Bạn chưa thuê món đồ nào</h3>
                    <p className="text-sm text-stone-500 max-w-sm mb-6">Hàng ngàn sản phẩm tuyệt đẹp đang chờ bạn khám phá trên CLOOP Market.</p>
                    <Link href="/shop" className="inline-flex items-center gap-2 bg-[#183A2D] text-white px-6 py-2.5 rounded-full text-sm font-bold hover:bg-[#112a20] transition-colors shadow-sm hover:shadow-md hover:-translate-y-0.5">
                      Khám phá ngay <ArrowRight size={16} />
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        `;

content = content.replace(dataTableRegex, newDataTable);

fs.writeFileSync('app/(dashboard)/my-closet/page.tsx', content, 'utf8');
