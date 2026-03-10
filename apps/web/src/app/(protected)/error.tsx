'use client';

export default function ProtectedError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4">
      <h2 className="text-xl font-semibold">Something went wrong</h2>
      <p className="text-gray-600">
        {error.message || 'An unexpected error occurred.'}
      </p>
      <button
        onClick={reset}
        className="rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700"
      >
        Try again
      </button>
    </div>
  );
}
