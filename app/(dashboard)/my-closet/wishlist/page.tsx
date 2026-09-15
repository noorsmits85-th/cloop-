import { getUserWishlistAction } from "@/app/actions/favorite";
import WishlistClient from "../_components/WishlistClient";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function WishlistPage() {
  const result = await getUserWishlistAction("ALL");

  if (result.error === "AUTH_REQUIRED") {
    redirect("/login?redirectTo=/my-closet/wishlist");
  }

  return (
    <div className="p-6 sm:p-8 max-w-7xl mx-auto">
      <WishlistClient
        initialItems={result.items || []}
        counts={result.counts || { all: 0, save: 0, like: 0 }}
      />
    </div>
  );
}
