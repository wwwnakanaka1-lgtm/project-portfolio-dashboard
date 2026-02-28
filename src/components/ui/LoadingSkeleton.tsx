"use client";

/**
 * Loading skeleton component with shimmer animation.
 * Used as fallback for dynamically imported tab content.
 */
export function LoadingSkeleton({ type }: { type: "monitor" | "graph" | "stats" | "table" }) {
  const shimmer = "animate-pulse bg-gray-200 dark:bg-gray-700 rounded";

  if (type === "monitor") {
    return (
      <div className="space-y-6">
        {/* Stats summary skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="p-4 rounded-xl border border-gray-200 dark:border-gray-700">
              <div className={`h-3 w-20 ${shimmer} mb-3`} />
              <div className={`h-7 w-16 ${shimmer} mb-1`} />
              <div className={`h-3 w-24 ${shimmer}`} />
            </div>
          ))}
        </div>
        {/* Session cards skeleton */}
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="p-4 rounded-xl border border-gray-200 dark:border-gray-700">
              <div className="flex items-start gap-3">
                <div className={`w-2 h-2 mt-2 rounded-full ${shimmer}`} />
                <div className="flex-1">
                  <div className={`h-4 w-48 ${shimmer} mb-2`} />
                  <div className={`h-3 w-32 ${shimmer}`} />
                </div>
                <div className={`h-5 w-16 ${shimmer}`} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (type === "graph") {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className={`w-64 h-64 mx-auto rounded-full ${shimmer} mb-4`} />
          <div className={`h-4 w-40 mx-auto ${shimmer}`} />
        </div>
      </div>
    );
  }

  if (type === "stats") {
    return (
      <div className="space-y-6">
        {/* Cost cards skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="p-4 rounded-xl border border-gray-200 dark:border-gray-700">
              <div className={`h-3 w-16 ${shimmer} mb-3`} />
              <div className={`h-6 w-20 ${shimmer}`} />
            </div>
          ))}
        </div>
        {/* Chart skeleton */}
        <div className={`h-48 ${shimmer}`} />
        {/* Monthly chart skeleton */}
        <div className="flex items-end justify-around gap-2 h-56">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <div className={`w-8 ${shimmer}`} style={{ height: `${60 + Math.random() * 120}px` }} />
              <div className={`h-3 w-8 ${shimmer}`} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // table
  return (
    <div className="space-y-4">
      <div className={`h-10 ${shimmer} mb-4`} />
      {[...Array(8)].map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-3">
          <div className={`h-4 w-4 ${shimmer}`} />
          <div className={`h-4 flex-1 ${shimmer}`} />
          <div className={`h-4 w-20 ${shimmer}`} />
          <div className={`h-4 w-16 ${shimmer}`} />
        </div>
      ))}
    </div>
  );
}
