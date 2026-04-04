export default function JournalLoading() {
  return (
    <div className="px-5 lg:px-10 py-6 lg:py-8 max-w-2xl mx-auto space-y-6">
      {/* Header skeleton */}
      <div className="space-y-2">
        <div className="h-9 w-36 animate-pulse rounded-xl bg-stone-200" />
        <div className="h-4 w-64 animate-pulse rounded bg-stone-100" />
      </div>

      {/* Streak + new entry button */}
      <div className="flex items-center justify-between">
        <div className="h-7 w-32 animate-pulse rounded-full bg-stone-100" />
        <div className="h-9 w-28 animate-pulse rounded-2xl bg-stone-200" />
      </div>

      {/* Entry cards */}
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-stone-200 bg-white p-6 space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="h-3.5 w-24 animate-pulse rounded bg-stone-100" />
            <div className="h-5 w-16 animate-pulse rounded-full bg-stone-100" />
          </div>
          <div className="space-y-2">
            <div className="h-3.5 w-full animate-pulse rounded bg-stone-100" />
            <div className="h-3.5 w-4/5 animate-pulse rounded bg-stone-100" />
            <div className="h-3.5 w-3/5 animate-pulse rounded bg-stone-100" />
          </div>
          <div className="flex gap-2">
            <div className="h-5 w-14 animate-pulse rounded-full bg-stone-100" />
            <div className="h-5 w-14 animate-pulse rounded-full bg-stone-100" />
          </div>
        </div>
      ))}
    </div>
  );
}
