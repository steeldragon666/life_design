import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <h1 className="text-4xl font-bold mb-4">Life Design</h1>
      <p className="text-lg text-slate-600 mb-8">Your personal well-being companion</p>
      <div className="flex gap-4">
        <Link
          href="/login"
          className="rounded-lg bg-indigo-500 px-6 py-3 text-white font-medium hover:bg-indigo-600 transition-colors"
        >
          Sign In
        </Link>
        <Link
          href="/signup"
          className="rounded-lg border border-indigo-500 px-6 py-3 text-indigo-500 font-medium hover:bg-indigo-50 transition-colors"
        >
          Sign Up
        </Link>
      </div>
    </main>
  );
}
