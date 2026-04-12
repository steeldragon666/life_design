export default function CorrelationsLoading() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <div className="h-8 w-40 animate-pulse rounded bg-stone-200" />
      <div className="h-64 animate-pulse rounded-2xl bg-stone-200" />
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-32 animate-pulse rounded-xl bg-stone-200" />
        ))}
      </div>
    </div>
  );
}
