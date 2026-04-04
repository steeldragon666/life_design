import { Skeleton } from '@life-design/ui';

export default function JourneyLoading() {
  return (
    <div className="px-5 lg:px-10 py-6 lg:py-8 max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-9 w-40 rounded-xl" />
        <Skeleton className="h-4 w-56 rounded-lg" />
      </div>

      {/* Stats row */}
      <div className="flex gap-3 overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-28 flex-shrink-0 rounded-2xl" />
        ))}
      </div>

      {/* Narrative card */}
      <Skeleton className="h-52 rounded-2xl" />

      {/* Highlights grid */}
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-2xl" />
        ))}
      </div>

      {/* Quotes */}
      <div className="space-y-4">
        <Skeleton className="h-5 w-28 rounded-lg" />
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>

      {/* Timeline */}
      <div className="space-y-4">
        <Skeleton className="h-5 w-20 rounded-lg" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-start gap-3">
            <Skeleton className="h-3 w-3 rounded-full mt-1 flex-shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3 w-20 rounded" />
              <Skeleton className="h-3.5 w-48 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
