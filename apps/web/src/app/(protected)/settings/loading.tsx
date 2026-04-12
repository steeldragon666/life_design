export default function SettingsLoading() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <div className="h-8 w-28 animate-pulse rounded bg-stone-200" />
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center justify-between rounded-xl border border-stone-200 bg-white p-4">
          <div className="space-y-2">
            <div className="h-4 w-32 animate-pulse rounded bg-stone-200" />
            <div className="h-3 w-48 animate-pulse rounded bg-stone-100" />
          </div>
          <div className="h-8 w-16 animate-pulse rounded-lg bg-stone-200" />
        </div>
      ))}
    </div>
  );
}
