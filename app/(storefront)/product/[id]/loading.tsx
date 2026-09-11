export default function ProductLoading() {
  return (
    <main className="min-h-screen bg-[#FAF8F3] antialiased px-4 py-4 md:py-8 animate-pulse">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Top bar skeleton */}
        <div className="flex items-center justify-between border-b border-stone-200/70 pb-3">
          <div className="h-4 w-36 bg-stone-200 rounded-full" />
          <div className="flex items-center gap-2">
            <div className="h-7 w-20 bg-stone-200 rounded-full" />
            <div className="h-7 w-7 bg-stone-200 rounded-full" />
          </div>
        </div>

        {/* Main 2-column skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
          
          {/* Left Column: Image Lookbook Skeleton */}
          <div className="lg:col-span-5 space-y-3.5">
            <div className="w-full aspect-[3/4] rounded-3xl bg-stone-200/80" />
            <div className="flex gap-2">
              <div className="w-14 aspect-[3/4] rounded-xl bg-stone-200" />
              <div className="w-14 aspect-[3/4] rounded-xl bg-stone-200" />
              <div className="w-14 aspect-[3/4] rounded-xl bg-stone-200" />
            </div>
            <div className="h-28 rounded-2xl bg-stone-200/60" />
          </div>

          {/* Right Column: Editorial Details Skeleton */}
          <div className="lg:col-span-7 space-y-5">
            <div className="flex items-center justify-between">
              <div className="h-4 w-32 bg-stone-200 rounded-full" />
              <div className="h-6 w-28 bg-stone-200 rounded-full" />
            </div>

            {/* Title */}
            <div className="space-y-2">
              <div className="h-8 w-4/5 bg-stone-200 rounded-xl" />
              <div className="h-4 w-60 bg-stone-200/70 rounded-full" />
            </div>

            {/* Transaction Switcher */}
            <div className="h-11 rounded-2xl bg-stone-200/70" />

            {/* Price card */}
            <div className="h-20 rounded-2xl bg-stone-200/60" />

            {/* Specs Bento */}
            <div className="h-48 rounded-2xl bg-stone-200/60" />

            {/* DPP */}
            <div className="h-32 rounded-2xl bg-stone-200/60" />

            {/* Booking Box */}
            <div className="h-40 rounded-2xl bg-stone-200/70" />
          </div>

        </div>

        {/* Reviews Section Skeleton */}
        <div className="h-48 rounded-3xl bg-stone-200/50 mt-8" />

      </div>
    </main>
  );
}
