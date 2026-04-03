'use client';

import { useState } from 'react';
import Link from 'next/link';
import { signUp } from '../actions';

function LeafIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 20A7 7 0 019.8 6.9C15.5 4.9 17 3.5 17 3.5s4 2 4 9-5.5 8-5.5 8" />
      <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
    </svg>
  );
}

export default function SignUpPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    const result = await signUp(formData);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAFAF8] px-4">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-[-15%] right-[-10%] w-[600px] h-[600px] bg-gradient-to-br from-[#C4D5C4]/25 via-[#B5D4E8]/15 to-transparent rounded-full blur-[100px]" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] bg-gradient-to-tr from-[#F5C9A3]/15 via-[#FCE8D5]/10 to-transparent rounded-full blur-[120px]" />
      </div>

      <div className="relative w-full max-w-sm space-y-8">
        {/* Logo */}
        <div className="text-center">
          <Link href="/" className="inline-flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#9BB89B] to-[#739A73] flex items-center justify-center shadow-sm">
              <LeafIcon className="w-5 h-5 text-white" />
            </div>
            <span className="font-['Instrument_Serif'] text-xl text-[#2A2623]">Life Design</span>
          </Link>
        </div>

        {/* Card */}
        <div className="bg-white/80 backdrop-blur-sm border border-[#E8E4DD]/60 rounded-2xl p-8 shadow-sm">
          <h1 className="font-['Instrument_Serif'] text-2xl text-[#1A1816] text-center mb-6">Create your account</h1>

          <form action={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[#3D3833] mb-1">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="w-full rounded-xl border border-[#D4CFC5] bg-[#F5F3EF] px-4 py-3 text-sm text-[#2A2623] placeholder-[#A8A198] focus:border-[#5A7F5A] focus:ring-2 focus:ring-[#5A7F5A]/15 outline-none transition-all"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-[#3D3833] mb-1">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                minLength={6}
                className="w-full rounded-xl border border-[#D4CFC5] bg-[#F5F3EF] px-4 py-3 text-sm text-[#2A2623] placeholder-[#A8A198] focus:border-[#5A7F5A] focus:ring-2 focus:ring-[#5A7F5A]/15 outline-none transition-all"
                placeholder="At least 6 characters"
              />
            </div>

            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200/60 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-[#5A7F5A] to-[#476447] text-white text-sm font-medium shadow-sm hover:shadow-md transition-all disabled:opacity-50"
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-[#A8A198]">
          Already have an account?{' '}
          <Link href="/login" className="text-[#5A7F5A] hover:text-[#476447] font-medium transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
