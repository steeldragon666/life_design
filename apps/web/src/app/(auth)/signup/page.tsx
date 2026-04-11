'use client';

import { useState } from 'react';
import Link from 'next/link';
import { signUp } from '../actions';
import { Leaf } from '@phosphor-icons/react';
import { Input, Button } from '@life-design/ui';

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
    <div className="min-h-screen flex items-center justify-center bg-stone-50 px-4">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-[-15%] right-[-10%] w-[600px] h-[600px] bg-gradient-to-br from-sage-200/25 via-accent-400/15 to-transparent rounded-full blur-[100px]" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] bg-gradient-to-tr from-warm-200/15 via-warm-100/10 to-transparent rounded-full blur-[120px]" />
      </div>

      <div className="relative w-full max-w-sm space-y-8">
        {/* Logo */}
        <div className="text-center">
          <Link href="/" className="inline-flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-sage-300 to-sage-400 flex items-center justify-center shadow-sm">
              <Leaf size={20} weight="light" className="text-white" />
            </div>
            <span className="font-serif text-xl text-stone-800">Opt In</span>
          </Link>
        </div>

        {/* Card */}
        <div className="bg-white/80 backdrop-blur-sm border border-stone-200/60 rounded-2xl p-8 shadow-sm">
          <h1 className="font-serif text-2xl text-stone-900 text-center mb-6">Create your account</h1>

          <form action={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-stone-700 mb-1">
                Email
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-stone-700 mb-1">
                Password
              </label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                minLength={6}
                placeholder="At least 6 characters"
              />
            </div>

            <div>
              <label htmlFor="inviteCode" className="block text-sm font-medium text-stone-700 mb-1">
                Invite Code
              </label>
              <Input
                id="inviteCode"
                name="inviteCode"
                type="text"
                required
                placeholder="Enter your invite code"
              />
            </div>

            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200/60 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              className="w-full rounded-xl"
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-stone-400">
          Already have an account?{' '}
          <Link href="/login" className="text-sage-500 hover:text-sage-600 font-medium transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
