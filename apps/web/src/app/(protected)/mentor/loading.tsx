export default function MentorLoading() {
  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-8">
      <div className="h-8 w-24 animate-pulse rounded bg-stone-200" />
      <div className="space-y-3 rounded-2xl border border-stone-200 bg-white p-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-14 animate-pulse rounded-xl bg-stone-100" />
        ))}
      </div>
    </div>
  );
}
