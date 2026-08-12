// app/loading.tsx
// Streaming loading skeleton for the main dream gallery page.
// Next.js wraps page.tsx in a <Suspense> boundary with this as the fallback,
// so users see a skeleton instantly while server-side data fetching completes.

import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="container py-6 sm:py-10">
      <div className="max-w-4xl mx-auto space-y-6 sm:space-y-10">
        {/* Dream input skeleton */}
        <div className="pb-8 sm:pb-10 border-b border-border/30">
          <div className="w-full sm:max-w-2xl sm:mx-auto">
            <Skeleton className="h-20 w-full rounded-xl" />
          </div>
        </div>

        {/* Dream grid skeleton */}
        <div className="mt-6 sm:mt-8">
          <Skeleton className="h-7 w-48 mb-4" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 min-h-[300px]">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-64 w-full rounded-md" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
