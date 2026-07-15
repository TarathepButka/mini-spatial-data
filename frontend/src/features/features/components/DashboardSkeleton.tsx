import { MapPinned } from "lucide-react";

/**
 * Full-page skeleton mimicking the FeaturesDashboard layout.
 * Shown while the auth session check is in progress so the user
 * sees an instant, familiar layout rather than a blank page or
 * a flashing login screen.
 */
export function DashboardSkeleton() {
  return (
    <div className="flex h-[100dvh] min-h-0 flex-col overflow-hidden bg-zinc-100 text-zinc-950 select-none">
      {/* Header Skeleton */}
      <header className="flex h-[69px] items-center justify-between border-b border-zinc-200 bg-white px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-zinc-200 text-zinc-400">
            <MapPinned size={18} />
          </div>
          <div className="h-5 w-48 rounded bg-zinc-200 animate-pulse" />
        </div>
        <div className="h-8 w-8 rounded-full bg-zinc-200 animate-pulse" />
      </header>

      {/* Toolbar Skeleton */}
      <div className="flex h-[65px] items-center gap-3 border-b border-zinc-200 bg-white px-4 py-3">
        <div className="h-10 w-64 rounded bg-zinc-200 animate-pulse" />
        <div className="h-10 w-36 rounded bg-zinc-200 animate-pulse" />
        <div className="h-10 w-36 rounded bg-zinc-200 animate-pulse" />
        <div className="h-10 w-24 rounded bg-zinc-200 animate-pulse" />
        <div className="h-10 w-24 rounded bg-zinc-200 animate-pulse" />
      </div>

      {/* Grid Content Skeleton */}
      <section className="grid min-h-0 flex-1 grid-cols-[minmax(480px,42%)_1fr] overflow-hidden max-lg:grid-cols-1">
        {/* Table Panel Skeleton */}
        <div className="flex flex-col gap-4 border-r border-zinc-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <div className="h-5 w-24 rounded bg-zinc-200 animate-pulse" />
            <div className="h-8 w-32 rounded bg-zinc-200 animate-pulse" />
          </div>
          <div className="mt-4 flex-1 space-y-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 border-b border-zinc-100 pb-3">
                <div className="h-4 w-4 rounded bg-zinc-200 animate-pulse" />
                <div className="h-4 flex-1 rounded bg-zinc-200 animate-pulse" />
                <div className="h-4 w-24 rounded bg-zinc-200 animate-pulse" />
                <div className="h-4 w-12 rounded bg-zinc-200 animate-pulse" />
              </div>
            ))}
          </div>
        </div>

        {/* Map Panel Skeleton */}
        <div className="relative flex items-center justify-center bg-zinc-200 animate-pulse">
          <span className="text-sm font-medium text-zinc-400">Loading map…</span>
        </div>
      </section>
    </div>
  );
}
