'use client';

import { useState } from 'react';
import Link from 'next/link';
import { signIn, signInWithGoogle } from '../actions';

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    const result = await signIn(formData);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 h-96 w-96 bg-primary-500/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-0 left-0 h-96 w-96 bg-indigo-500/10 rounded-full blur-[120px]" />

      <div className="w-full max-w-md glass-card space-y-8 relative z-10">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-gradient">Welcome Back</h1>
          <p className="text-slate-400">Sign in to continue your evolution</p>
        </div>

        <form action={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="email" className="block text-sm font-medium text-slate-300 ml-1">
              Email Address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              placeholder="name@example.com"
              className="mt-1 block w-full glass rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-all"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="block text-sm font-medium text-slate-300 ml-1">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              placeholder="••••••••"
              className="mt-1 block w-full glass rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-all"
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
              <p className="text-xs text-red-400 text-center">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-premium w-full disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-white/5" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-[#0a0a0c] px-2 text-slate-500">Or continue with</span>
          </div>
        </div>

        <button
          onClick={() => {
            setLoading(true);
            signInWithGoogle();
          }}
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 glass rounded-xl py-3 hover:bg-white/5 transition-all text-sm font-medium border-white/5"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Google Cloud
        </button>

        <p className="text-center text-sm text-slate-400">
          New to Life Design?{' '}
          <Link href="/signup" className="text-primary-400 hover:text-primary-300 transition-colors font-medium">
            Create account
          </Link>
        </p>
      </div>
    </div>
  );
}
