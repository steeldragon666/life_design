export default function CompanionLoading() {
  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-8">
      <div className="h-8 w-28 animate-pulse rounded bg-stone-200" />
      <div className="flex-1 space-y-3 rounded-2xl border border-stone-200 bg-white p-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className={`h-12 animate-pulse rounded-xl ${i % 2 === 0 ? 'mr-16 bg-stone-100' : 'ml-16 bg-sage-50'}`}
          />
        ))}
      </div>
      <div className="h-12 animate-pulse rounded-xl bg-stone-200" />
    </div>
  );
}
