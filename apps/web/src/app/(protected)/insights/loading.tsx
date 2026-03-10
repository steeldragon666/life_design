export default function InsightsLoading() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <div className="h-8 w-32 animate-pulse rounded bg-gray-200" />
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-lg bg-gray-200" />
        ))}
      </div>
    </div>
  );
}
