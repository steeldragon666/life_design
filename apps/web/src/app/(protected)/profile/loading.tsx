export default function ProfileLoading() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <div className="flex items-center gap-4">
        <div className="h-16 w-16 animate-pulse rounded-full bg-stone-200" />
        <div className="space-y-2">
          <div className="h-6 w-36 animate-pulse rounded bg-stone-200" />
          <div className="h-4 w-48 animate-pulse rounded bg-stone-200" />
        </div>
      </div>
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-xl bg-stone-200" />
        ))}
      </div>
    </div>
  );
}
