export default function PaywallLoading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="w-full max-w-3xl space-y-6">
        <div className="mx-auto h-8 w-64 animate-pulse rounded bg-stone-200" />
        <div className="grid gap-6 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-72 animate-pulse rounded-2xl bg-stone-200" />
          ))}
        </div>
      </div>
    </div>
  );
}
