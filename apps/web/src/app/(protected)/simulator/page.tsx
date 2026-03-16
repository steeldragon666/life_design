'use client';

import Link from 'next/link';
import { Flask } from '@phosphor-icons/react';

export default function SimulatorPage() {
  return (
    <div className="min-h-screen bg-stone-50 pb-24">
      <div className="max-w-2xl mx-auto px-4 pt-10">
        <header className="mb-8">
          <h1 className="font-serif text-3xl text-stone-800">Life Simulator</h1>
          <p className="mt-1 text-sm text-stone-500">
            Model &ldquo;What if?&rdquo; scenarios and see how changes cascade across your life dimensions.
          </p>
        </header>

        <div className="bg-white border border-stone-200/60 rounded-2xl p-8 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-sage-100 to-sage-200 flex items-center justify-center mx-auto">
            <Flask size={28} weight="regular" className="text-sage-600" />
          </div>
          <h2 className="font-serif text-xl text-stone-800">Coming Soon</h2>
          <p className="text-sm text-stone-500 max-w-sm mx-auto leading-relaxed">
            The Life Simulator will let you explore scenarios like changing jobs, starting therapy,
            or moving cities — and see data-driven projections of how all 8 dimensions respond.
          </p>
          <p className="text-xs text-stone-400">
            Start checking in regularly to build the data foundation for accurate simulations.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-sage-500 to-sage-600 text-sm font-medium text-white shadow-sm hover:shadow-md transition-all mt-2"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
