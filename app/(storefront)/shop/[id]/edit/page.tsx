import React from "react";
import { redirect, notFound } from "next/navigation";
import { requireUser } from "@/src/lib/auth";
import { getProductForEditAction } from "@/app/(dashboard)/my-closet/create/actions";
import EditProductClient from "./EditProductClient";

export const dynamic = "force-dynamic";

export default async function EditProductPage({
  params
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  let user;
  try {
    user = await requireUser();
  } catch (err) {
    redirect("/login");
  }

  const resolvedParams = await params;
  const productId = resolvedParams.id;

  const res = await getProductForEditAction(productId);
  if (!res.success || !res.product) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-[#FAF9F5] py-8 px-4 sm:px-8 text-stone-800 antialiased">
      <EditProductClient product={res.product} />
    </div>
  );
}
