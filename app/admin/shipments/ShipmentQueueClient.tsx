"use client";

import { useMemo, useState, useTransition } from "react";
import { createGhnShipmentAction, markShipmentBookedAction } from "@/app/actions/shipment";

type ShipmentRow = {
  id: string;
  rentalId: string;
  direction: "DELIVERY" | "RETURN";
  status: string;
  provider: string | null;
  trackingCode: string | null;
  clientOrderCode: string | null;
  shippingFeeCollected: number;
  actualShippingFee: number | null;
  createdAt: string;
  pickupAddress?: {
    name?: string;
    phone?: string;
    province?: string;
    districtId?: number;
    wardCode?: string;
    specificAddress?: string;
  } | null;
  deliveryAddress?: {
    name?: string;
    phone?: string;
    province?: string;
    districtId?: number;
    wardCode?: string;
    specificAddress?: string;
    address?: string;
  } | null;
  rental: {
    id: string;
    status: string;
    renter_name: string | null;
    renter_phone: string | null;
    owner_name: string | null;
    owner_phone: string | null;
    depositAmount: number;
    product: {
      title: string;
      province: string;
      districtId?: number | null;
      wardCode?: string | null;
      specificAddress: string;
    } | null;
  };
};

function formatVnd(amount: number): string {
  return `${amount.toLocaleString("vi-VN")}₫`;
}

function getStatusBadge(status: string) {
  switch (status) {
    case "PENDING_BOOKING":
      return {
        label: "Chờ tạo vận đơn",
        className: "bg-amber-50 text-amber-900 border border-amber-300",
      };
    case "BOOKED":
      return {
        label: "Đã tạo vận đơn",
        className: "bg-blue-50 text-blue-900 border border-blue-300",
      };
    case "PICKING":
      return {
        label: "Bưu tá đang lấy hàng",
        className: "bg-purple-50 text-purple-900 border border-purple-300",
      };
    case "IN_TRANSIT":
      return {
        label: "Đang vận chuyển",
        className: "bg-emerald-50 text-emerald-900 border border-emerald-300",
      };
    case "DELIVERED":
      return {
        label: "Giao thành công",
        className: "bg-stone-50 text-stone-700 border border-stone-200",
      };
    default:
      return {
        label: status,
        className: "bg-stone-50 text-stone-700 border border-stone-200",
      };
  }
}

export default function ShipmentQueueClient({ shipments }: { shipments: ShipmentRow[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(shipments[0]?.id || null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [isManualOpen, setIsManualOpen] = useState(false);

  const [notification, setNotification] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [isPending, startTransition] = useTransition();
  const [isAutoCreating, setIsAutoCreating] = useState(false);

  const filteredShipments = useMemo(() => {
    return shipments.filter((item) => {
      if (statusFilter !== "ALL" && item.status !== statusFilter) {
        return false;
      }
      if (!searchTerm.trim()) return true;

      const q = searchTerm.toLowerCase();
      const productTitle = item.rental.product?.title?.toLowerCase() || "";
      const tracking = item.trackingCode?.toLowerCase() || "";
      const clientCode = item.clientOrderCode?.toLowerCase() || "";
      const owner = item.rental.owner_name?.toLowerCase() || "";
      const renter = item.rental.renter_name?.toLowerCase() || "";

      return (
        productTitle.includes(q) ||
        tracking.includes(q) ||
        clientCode.includes(q) ||
        owner.includes(q) ||
        renter.includes(q)
      );
    });
  }, [shipments, statusFilter, searchTerm]);

  const selectedShipment = useMemo(() => {
    if (!selectedId) return filteredShipments[0] || null;
    return shipments.find((s) => s.id === selectedId) || filteredShipments[0] || null;
  }, [shipments, selectedId, filteredShipments]);

  async function handleAutoCreateGhn() {
    if (!selectedShipment) return;
    setNotification(null);
    setIsAutoCreating(true);

    try {
      const result = await createGhnShipmentAction(selectedShipment.id);
      if (result.success) {
        setNotification({
          type: "success",
          text: result.message || `Tạo vận đơn GHN thành công! Mã: ${result.trackingCode}`,
        });
      } else {
        setNotification({
          type: "error",
          text: result.error || "Không thể tạo vận đơn GHN. Vui lòng kiểm tra lại thông tin.",
        });
      }
    } catch (err: any) {
      setNotification({
        type: "error",
        text: err?.message || "Lỗi hệ thống khi kết nối đến GHN Gateway.",
      });
    } finally {
      setIsAutoCreating(false);
    }
  }

  async function handleManualSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedShipment) return;
    setNotification(null);

    const form = e.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      const result = await markShipmentBookedAction({
        shipmentId: selectedShipment.id,
        provider: String(formData.get("provider") || "GHN"),
        trackingCode: String(formData.get("trackingCode") || "").trim(),
        providerOrderCode: String(formData.get("providerOrderCode") || "").trim() || undefined,
        actualShippingFee: Number(formData.get("actualShippingFee") || 0),
      });

      if (result.success) {
        setNotification({
          type: "success",
          text: result.message || "Đã lưu mã vận đơn thủ công thành công.",
        });
        setIsManualOpen(false);
      } else {
        setNotification({
          type: "error",
          text: result.error || "Không thể lưu mã vận đơn thủ công.",
        });
      }
    });
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    setCopiedCode(text);
    setTimeout(() => setCopiedCode(null), 2000);
  }

  return (
    <div className="w-full text-stone-900 pb-16 space-y-6">
      {/* TIÊU ĐỀ CHÍNH - 100% TIẾNG VIỆT, KHÔNG ICON VỚ VẨN */}
      <div className="flex flex-col gap-3 border-b border-stone-200 pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#183A2D] uppercase">
            Điều Phối Vận Chuyển Giao Hàng Nhanh
          </h1>
          <p className="mt-1 text-xs text-stone-500">
            Quản lý và tạo mã vận chuyển đối soát trực tiếp với Giao Hàng Nhanh (GHN).
          </p>
        </div>
        <div className="rounded border border-stone-200 bg-white px-3 py-1.5 text-xs font-bold text-stone-700">
          Tổng số: {shipments.length} vận đơn
        </div>
      </div>

      {/* THÔNG BÁO KẾT QUẢ */}
      {notification && (
        <div
          className={`flex items-start justify-between gap-3 rounded border p-3.5 text-xs font-semibold ${
            notification.type === "success"
              ? "border-emerald-300 bg-emerald-50 text-emerald-900"
              : "border-rose-300 bg-rose-50 text-rose-900"
          }`}
        >
          <span>{notification.text}</span>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="text-[11px] font-bold uppercase opacity-70 hover:opacity-100"
          >
            Đóng
          </button>
        </div>
      )}

      {/* BỘ LỌC VÀ TÌM KIẾM */}
      <div className="flex flex-col gap-3 rounded border border-stone-200 bg-white p-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: "ALL", label: "Tất cả" },
            { id: "PENDING_BOOKING", label: "Chờ tạo vận đơn" },
            { id: "BOOKED", label: "Đã tạo vận đơn" },
            { id: "IN_TRANSIT", label: "Đang vận chuyển" },
            { id: "DELIVERED", label: "Đã giao thành công" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`rounded px-3 py-1 text-xs font-bold transition ${
                statusFilter === tab.id
                  ? "bg-[#183A2D] text-white"
                  : "bg-stone-100 text-stone-700 hover:bg-stone-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="w-full md:w-64">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo sản phẩm, tên, mã..."
            className="w-full rounded border border-stone-300 px-3 py-1 text-xs outline-none focus:border-emerald-800"
          />
        </div>
      </div>

      {/* GIAO DIỆN 2 CỘT: DANH SÁCH & BẢNG ĐIỀU PHỐI */}
      <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
        {/* CỘT DANH SÁCH ĐƠN HÀNG */}
        <div className="rounded border border-stone-200 bg-white">
          {filteredShipments.length === 0 ? (
            <div className="flex min-h-[300px] flex-col items-center justify-center p-6 text-center text-xs text-stone-500">
              <p className="font-bold">Không tìm thấy đơn hàng nào phù hợp.</p>
            </div>
          ) : (
            <div className="divide-y divide-stone-100">
              {filteredShipments.map((shipment) => {
                const statusBadge = getStatusBadge(shipment.status);
                const isSelected = selectedShipment?.id === shipment.id;
                const isDelivery = shipment.direction === "DELIVERY";
                const displayOrderCode = `CLP-${shipment.rentalId.slice(0, 8).toUpperCase()}`;

                return (
                  <button
                    key={shipment.id}
                    type="button"
                    onClick={() => setSelectedId(shipment.id)}
                    className={`block w-full p-4 text-left transition hover:bg-stone-50 ${
                      isSelected ? "bg-emerald-50/60 border-l-4 border-l-[#183A2D]" : "bg-white"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                            isDelivery ? "bg-[#183A2D] text-white" : "bg-amber-800 text-white"
                          }`}
                        >
                          {isDelivery ? "Chiều đi (Giao đồ)" : "Chiều về (Hoàn trả)"}
                        </span>
                        <span
                          className={`rounded px-2 py-0.5 text-[11px] font-bold ${statusBadge.className}`}
                        >
                          {statusBadge.label}
                        </span>
                      </div>
                      <span className="font-mono text-[11px] font-bold text-stone-500">
                        {displayOrderCode}
                      </span>
                    </div>

                    <h2 className="mt-2 text-sm font-bold text-stone-900 line-clamp-1">
                      {shipment.rental.product?.title || "Sản phẩm thời trang"}
                    </h2>

                    <div className="mt-1.5 grid grid-cols-2 gap-2 text-xs text-stone-600">
                      <div>
                        <span className="text-stone-400">Người gửi: </span>
                        <span className="font-medium text-stone-800">
                          {isDelivery ? shipment.rental.owner_name || "Chủ tủ" : shipment.rental.renter_name || "Khách thuê"}
                        </span>
                      </div>
                      <div>
                        <span className="text-stone-400">Người nhận: </span>
                        <span className="font-medium text-stone-800">
                          {isDelivery ? shipment.rental.renter_name || "Khách thuê" : shipment.rental.owner_name || "Chủ tủ"}
                        </span>
                      </div>
                    </div>

                    <div className="mt-2.5 flex items-center justify-between border-t border-stone-100 pt-2 text-xs">
                      <div>
                        {shipment.trackingCode ? (
                          <span className="font-mono font-bold text-emerald-800">
                            Mã: {shipment.trackingCode}
                          </span>
                        ) : (
                          <span className="text-stone-400 italic">Chưa tạo vận đơn</span>
                        )}
                      </div>

                      <div className="text-right">
                        <span className="text-stone-400 mr-1">Cước khách trả:</span>
                        <span className="font-mono font-bold text-[#183A2D]">
                          {formatVnd(shipment.shippingFeeCollected)}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* CỘT CHI TIẾT & HÀNH ĐỘNG TẠO VẬN ĐƠN */}
        <div className="rounded border border-stone-200 bg-white p-5 space-y-4">
          {selectedShipment ? (
            <>
              {/* TIÊU ĐỀ CHI TIẾT */}
              <div className="border-b border-stone-200 pb-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#183A2D]">
                    Chi tiết điều phối
                  </span>
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-bold ${
                      getStatusBadge(selectedShipment.status).className
                    }`}
                  >
                    {getStatusBadge(selectedShipment.status).label}
                  </span>
                </div>
                <h3 className="mt-1 text-sm font-bold text-stone-900">
                  {selectedShipment.rental.product?.title || "Sản phẩm thời trang"}
                </h3>
                <p className="mt-0.5 font-mono text-xs text-stone-500">
                  Mã đơn: CLP-{selectedShipment.rentalId.slice(0, 8).toUpperCase()} ({selectedShipment.direction === "DELIVERY" ? "Chiều đi" : "Chiều về"})
                </p>
              </div>

              {/* KHỐI HIỂN THỊ MÃ VẬN ĐƠN ĐÃ CẤP */}
              {selectedShipment.trackingCode && (
                <div className="rounded border border-stone-200 bg-stone-50 p-3 space-y-2">
                  <div className="flex items-center justify-between text-xs text-stone-500 font-bold uppercase">
                    <span>Mã vận đơn hiện tại:</span>
                    <span className="font-mono text-stone-700">GHN</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-base font-bold text-[#183A2D]">
                      {selectedShipment.trackingCode}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => copyToClipboard(selectedShipment.trackingCode!)}
                        className="rounded border border-stone-300 bg-white px-2 py-1 text-xs font-bold text-stone-700 hover:bg-stone-100"
                      >
                        Sao chép
                      </button>
                      <a
                        href={`https://tracking.ghn.dev/?order_code=${selectedShipment.trackingCode}`}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded bg-[#183A2D] px-2.5 py-1 text-xs font-bold text-white hover:bg-emerald-900"
                      >
                        Tra cứu GHN
                      </a>
                    </div>
                  </div>
                  {copiedCode === selectedShipment.trackingCode && (
                    <p className="text-[11px] font-bold text-emerald-700">Đã sao chép mã.</p>
                  )}

                  {selectedShipment.actualShippingFee !== null && (
                    <div className="border-t border-stone-200 pt-2 flex items-center justify-between text-xs">
                      <span className="text-stone-500">Cước GHN thực tế:</span>
                      <span className="font-mono font-bold text-stone-900">
                        {formatVnd(selectedShipment.actualShippingFee)}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* HÀNH ĐỘNG TẠO VẬN ĐƠN GHN QUA API */}
              <div className="rounded border border-stone-300 bg-stone-50/40 p-4 space-y-2.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-stone-700">
                  Tạo Vận Đơn Trực Tiếp Qua GHN API
                </h4>
                <button
                  type="button"
                  onClick={handleAutoCreateGhn}
                  disabled={isAutoCreating || isPending}
                  className="w-full rounded bg-[#183A2D] py-2.5 text-xs font-bold uppercase tracking-wider text-white hover:bg-emerald-900 transition disabled:opacity-60 cursor-pointer"
                >
                  {isAutoCreating ? "Đang tạo vận đơn..." : (selectedShipment.trackingCode ? "Tạo lại vận đơn GHN" : "Tạo vận đơn GHN tự động")}
                </button>
              </div>

              {/* ĐỊA CHỈ NGƯỜI GỬI & NGƯỜI NHẬN */}
              <div className="rounded border border-stone-200 p-3.5 space-y-3 text-xs">
                <div>
                  <p className="text-[10px] font-bold uppercase text-stone-400">
                    Điểm lấy hàng (Người gửi - {selectedShipment.direction === "DELIVERY" ? "Chủ tủ" : "Khách thuê"}):
                  </p>
                  <p className="mt-0.5 font-bold text-stone-900">
                    {selectedShipment.direction === "DELIVERY"
                      ? selectedShipment.rental.owner_name || "Chủ tủ"
                      : selectedShipment.rental.renter_name || "Khách thuê"}
                    {" • "}
                    <span className="font-mono font-normal">
                      {selectedShipment.direction === "DELIVERY"
                        ? selectedShipment.rental.owner_phone || selectedShipment.pickupAddress?.phone || "Chưa có SĐT"
                        : selectedShipment.rental.renter_phone || selectedShipment.pickupAddress?.phone || "Chưa có SĐT"}
                    </span>
                  </p>
                  <p className="text-stone-600 mt-0.5">
                    {selectedShipment.pickupAddress?.specificAddress ||
                      selectedShipment.rental.product?.specificAddress ||
                      selectedShipment.rental.product?.province ||
                      "Địa chỉ chưa cập nhật"}
                  </p>
                </div>

                <div className="border-t border-stone-100 pt-2.5">
                  <p className="text-[10px] font-bold uppercase text-stone-400">
                    Điểm giao hàng (Người nhận - {selectedShipment.direction === "DELIVERY" ? "Khách thuê" : "Chủ tủ"}):
                  </p>
                  <p className="mt-0.5 font-bold text-stone-900">
                    {selectedShipment.direction === "DELIVERY"
                      ? selectedShipment.rental.renter_name || "Khách thuê"
                      : selectedShipment.rental.owner_name || "Chủ tủ"}
                    {" • "}
                    <span className="font-mono font-normal">
                      {selectedShipment.direction === "DELIVERY"
                        ? selectedShipment.rental.renter_phone || selectedShipment.deliveryAddress?.phone || "Chưa có SĐT"
                        : selectedShipment.rental.owner_phone || selectedShipment.deliveryAddress?.phone || "Chưa có SĐT"}
                    </span>
                  </p>
                  <p className="text-stone-600 mt-0.5">
                    {selectedShipment.deliveryAddress?.specificAddress ||
                      selectedShipment.deliveryAddress?.address ||
                      selectedShipment.rental.product?.province ||
                      "Địa chỉ chưa cập nhật"}
                  </p>
                </div>
              </div>

              {/* TÙY CHỌN NHẬP THỦ CÔNG */}
              <div className="border-t border-stone-200 pt-2">
                <button
                  type="button"
                  onClick={() => setIsManualOpen(!isManualOpen)}
                  className="w-full text-left text-xs font-bold text-stone-500 hover:text-stone-900 flex justify-between items-center py-1"
                >
                  <span>Nhập mã vận đơn thủ công</span>
                  <span>{isManualOpen ? "▲" : "▼"}</span>
                </button>

                {isManualOpen && (
                  <form onSubmit={handleManualSubmit} className="mt-2 space-y-2 rounded border border-stone-200 p-3 bg-stone-50">
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-stone-500 mb-1">
                        Đơn vị vận chuyển
                      </label>
                      <select
                        name="provider"
                        defaultValue={selectedShipment.provider || "GHN"}
                        className="w-full rounded border border-stone-300 bg-white px-2 py-1.5 text-xs outline-none"
                      >
                        <option value="GHN">Giao Hàng Nhanh (GHN)</option>
                        <option value="GHTK">Giao Hàng Tiết Kiệm (GHTK)</option>
                        <option value="MANUAL">Tự giao nhận / Khác</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase text-stone-500 mb-1">
                        Mã vận đơn
                      </label>
                      <input
                        name="trackingCode"
                        required
                        minLength={3}
                        defaultValue={selectedShipment.trackingCode || ""}
                        placeholder="Mã vận đơn..."
                        className="w-full rounded border border-stone-300 bg-white px-2 py-1.5 font-mono text-xs outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase text-stone-500 mb-1">
                        Cước vận chuyển thực tế (₫)
                      </label>
                      <input
                        name="actualShippingFee"
                        type="number"
                        min={0}
                        defaultValue={selectedShipment.actualShippingFee || selectedShipment.shippingFeeCollected || 0}
                        className="w-full rounded border border-stone-300 bg-white px-2 py-1.5 font-mono text-xs outline-none"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isPending}
                      className="w-full rounded border border-stone-300 bg-white py-1.5 text-xs font-bold text-stone-800 hover:bg-stone-100 transition disabled:opacity-60"
                    >
                      Lưu mã thủ công
                    </button>
                  </form>
                )}
              </div>
            </>
          ) : (
            <div className="flex min-h-[250px] items-center justify-center text-xs text-stone-400">
              Chọn một đơn hàng để điều phối.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
