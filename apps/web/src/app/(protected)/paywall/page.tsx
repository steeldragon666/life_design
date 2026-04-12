'use client';

import Link from 'next/link';
import { Shield, Sparkles, Zap, Check } from 'lucide-react';
import { OptInTierSelectorWithState } from '@/components/settings/opt-in-tier-selector';

export default function PaywallPage() {
  return (
    <div className="px-5 lg:px-10 py-6 lg:py-8 max-w-4xl mx-auto">
      <div className="mb-8 text-center">
        <h1 className="font-serif text-3xl lg:text-4xl text-stone-900">
          Choose Your Experience
        </h1>
        <p className="text-sm text-stone-500 mt-2 max-w-lg mx-auto">
          Select how much data you want to share. Higher tiers unlock deeper
          insights — you can change this at any time from Settings.
        </p>
      </div>

      <OptInTierSelectorWithState />

      <div className="mt-8 text-center">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 px-7 py-3 rounded-2xl bg-gradient-to-r from-sage-500 to-sage-600 text-sm font-semibold text-white shadow-sm hover:shadow-md transition-all"
        >
          Continue to Dashboard
        </Link>
      </div>

      <p className="mt-6 text-center text-xs text-stone-400">
        All tiers are free during beta. You can upgrade or downgrade anytime in{' '}
        <Link href="/settings" className="underline hover:text-stone-600">
          Settings → Data &amp; Privacy
        </Link>.
      </p>
    </div>
  );
}
