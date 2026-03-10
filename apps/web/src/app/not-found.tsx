import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-4xl font-bold">404</h1>
      <p className="text-gray-600">Page not found</p>
      <Link
        href="/dashboard"
        className="rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700"
      >
        Back to Dashboard
      </Link>
    </div>
  );
}
