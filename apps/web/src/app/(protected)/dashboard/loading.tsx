export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <div className="h-8 w-48 animate-pulse rounded bg-gray-200" />
      <div className="grid gap-6 md:grid-cols-2">
        <div className="h-64 animate-pulse rounded-lg bg-gray-200" />
        <div className="h-64 animate-pulse rounded-lg bg-gray-200" />
      </div>
      <div className="h-32 animate-pulse rounded-lg bg-gray-200" />
    </div>
  );
}
