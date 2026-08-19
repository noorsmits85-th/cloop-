import { getUserWishlistAction } from "@/app/actions/favorite";
import WishlistClient from "../_components/WishlistClient";

export const dynamic = "force-dynamic";

export default async function WishlistPage() {
  const result = await getUserWishlistAction("ALL");

  return (
    <div className="p-6 sm:p-8 max-w-7xl mx-auto">
      <WishlistClient
        initialItems={result.items || []}
        counts={result.counts || { all: 0, save: 0, like: 0 }}
      />
    </div>
  );
}
