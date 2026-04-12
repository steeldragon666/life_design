export default function TimelineLoading() {
  return (
    <div className="px-5 py-6 space-y-6">
      <div className="flex gap-2 mb-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-7 w-20 animate-pulse rounded-full bg-stone-200" />
        ))}
      </div>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex gap-4">
          <div className="w-10 h-10 rounded-full animate-pulse bg-stone-200 shrink-0" />
          <div className="flex-1 h-28 animate-pulse rounded-2xl bg-stone-200" />
        </div>
      ))}
    </div>
  );
}
