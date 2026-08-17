"use client";

import { useMemo, useState, useTransition } from "react";
import { CheckCircle2, Loader2, PackageCheck, Truck } from "lucide-react";
import { markShipmentBookedAction } from "@/app/actions/shipment";

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
  rental: {
    renter_name: string | null;
    renter_phone: string | null;
    owner_name: string | null;
    owner_phone: string | null;
    product: {
      title: string;
      province: string;
      specificAddress: string;
    };
  };
};

export default function ShipmentQueueClient({ shipments }: { shipments: ShipmentRow[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedShipment = useMemo(
    () => shipments.find((shipment) => shipment.id === selectedId) || shipments[0],
    [shipments, selectedId]
  );

  async function submitBooking(formData: FormData) {
    setMessage(null);
    startTransition(async () => {
      const result = await markShipmentBookedAction({
        shipmentId: String(formData.get("shipmentId") || ""),
        provider: String(formData.get("provider") || "GHN"),
        trackingCode: String(formData.get("trackingCode") || ""),
        providerOrderCode: String(formData.get("providerOrderCode") || "") || undefined,
        actualShippingFee: Number(formData.get("actualShippingFee") || 0),
      });

      setMessage(result.success ? "Da cap nhat ma van don." : result.error || "Cap nhat that bai.");
    });
  }

  return (
    <div className="min-h-screen bg-[#F7F5EF] px-4 py-8 text-stone-900 sm:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-3 border-b border-stone-200 pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">CLOOP Ops</p>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-[#183A2D]">Shipment Queue</h1>
            <p className="mt-2 max-w-2xl text-sm text-stone-500">
              Don chu do da dong goi, cho Admin tao van don GHN/GHTK hoac nhap ma thu cong.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-md border border-emerald-900/10 bg-white px-4 py-3 text-sm font-bold text-[#183A2D]">
            <Truck size={18} />
            {shipments.length} shipment dang theo doi
          </div>
        </div>

        {message && (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
            {message}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
          <div className="overflow-hidden rounded-md border border-stone-200 bg-white">
            {shipments.length === 0 ? (
              <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 text-center text-stone-500">
                <PackageCheck className="text-emerald-700" size={36} />
                <p className="text-sm font-bold">Khong co don nao cho tao van don.</p>
              </div>
            ) : (
              shipments.map((shipment) => (
                <button
                  key={shipment.id}
                  type="button"
                  onClick={() => setSelectedId(shipment.id)}
                  className={`grid w-full gap-3 border-b border-stone-100 p-4 text-left transition hover:bg-stone-50 md:grid-cols-[1fr_150px_120px] ${
                    selectedShipment?.id === shipment.id ? "bg-emerald-50/60" : "bg-white"
                  }`}
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded bg-[#183A2D] px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                        {shipment.direction}
                      </span>
                      <span className="text-xs font-bold text-emerald-700">{shipment.status}</span>
                    </div>
                    <h2 className="mt-2 text-sm font-black text-stone-900">{shipment.rental.product.title}</h2>
                    <p className="mt-1 text-xs text-stone-500">
                      Owner: {shipment.rental.owner_name || "N/A"} - Renter: {shipment.rental.renter_name || "N/A"}
                    </p>
                    <p className="mt-1 text-xs text-stone-400">{shipment.clientOrderCode}</p>
                  </div>
                  <div className="text-xs text-stone-500">
                    <p className="font-bold text-stone-800">{shipment.rental.product.province}</p>
                    <p className="mt-1 line-clamp-2">{shipment.rental.product.specificAddress}</p>
                  </div>
                  <div className="text-left md:text-right">
                    <p className="text-xs font-bold text-stone-400">Thu ship</p>
                    <p className="font-mono text-sm font-black text-[#183A2D]">
                      {shipment.shippingFeeCollected.toLocaleString("vi-VN")}d
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>

          <div className="rounded-md border border-stone-200 bg-white p-5">
            <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-[#183A2D]">
              <CheckCircle2 size={18} />
              Nhap ma van don
            </h2>

            {selectedShipment ? (
              <form action={submitBooking} className="mt-5 space-y-4">
                <input type="hidden" name="shipmentId" value={selectedShipment.id} />
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-stone-500">Provider</label>
                  <select name="provider" className="w-full rounded-md border border-stone-200 px-3 py-2 text-sm outline-none focus:border-emerald-700">
                    <option value="GHN">GHN</option>
                    <option value="GHTK">GHTK</option>
                    <option value="MANUAL">Manual</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-stone-500">Tracking code</label>
                  <input name="trackingCode" required minLength={3} className="w-full rounded-md border border-stone-200 px-3 py-2 font-mono text-sm outline-none focus:border-emerald-700" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-stone-500">Provider order code</label>
                  <input name="providerOrderCode" className="w-full rounded-md border border-stone-200 px-3 py-2 font-mono text-sm outline-none focus:border-emerald-700" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-stone-500">Phi ship thuc te</label>
                  <input name="actualShippingFee" type="number" min={0} defaultValue={35000} className="w-full rounded-md border border-stone-200 px-3 py-2 font-mono text-sm outline-none focus:border-emerald-700" />
                </div>
                <div className="rounded-md bg-stone-50 p-3 text-xs text-stone-500">
                  <p className="font-bold text-stone-700">Pickup</p>
                  <p>{selectedShipment.rental.owner_name || "Owner"} - {selectedShipment.rental.owner_phone || "N/A"}</p>
                  <p className="mt-2 font-bold text-stone-700">Delivery</p>
                  <p>{selectedShipment.rental.renter_name || "Renter"} - {selectedShipment.rental.renter_phone || "N/A"}</p>
                </div>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex w-full items-center justify-center gap-2 rounded-md bg-[#183A2D] px-4 py-3 text-sm font-black uppercase tracking-wider text-white transition hover:bg-emerald-800 disabled:opacity-60"
                >
                  {isPending ? <Loader2 className="animate-spin" size={16} /> : <Truck size={16} />}
                  Luu van don
                </button>
              </form>
            ) : (
              <p className="mt-6 text-sm text-stone-500">Chon mot shipment de nhap ma van don.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
