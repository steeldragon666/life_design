export default function OnboardingLoading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="mx-auto h-16 w-16 animate-pulse rounded-2xl bg-sage-100" />
        <div className="mx-auto h-6 w-48 animate-pulse rounded bg-stone-200" />
        <div className="mx-auto h-4 w-64 animate-pulse rounded bg-stone-200" />
      </div>
    </div>
  );
}
