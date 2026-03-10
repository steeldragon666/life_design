export default function CheckinLoading() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <div className="h-8 w-32 animate-pulse rounded bg-gray-200" />
      <div className="h-12 animate-pulse rounded-lg bg-gray-200" />
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-lg bg-gray-200" />
        ))}
      </div>
    </div>
  );
}
