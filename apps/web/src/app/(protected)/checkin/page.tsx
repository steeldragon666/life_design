'use client';

import Link from 'next/link';
import { CheckCircle } from 'lucide-react';
import { useGuest } from '@/lib/guest-context';
import { Card } from '@life-design/ui';
import CheckInClient from './checkin-client';

export default function CheckInPage() {
  const { checkins } = useGuest();
  const today = new Date().toISOString().slice(0, 10);
  const existing = checkins.find(c => c.date === today);

  if (existing) {
    return (
      <div className="px-5 lg:px-10 py-6 lg:py-8 max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="font-serif text-3xl lg:text-4xl text-stone-900">Daily Check-in</h1>
          <p className="text-sm text-stone-400 mt-1">Take a moment to reflect on your day</p>
        </div>

        <div className="text-center py-12 space-y-6">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-sage-100 to-sage-200 flex items-center justify-center mx-auto">
            <CheckCircle className="w-10 h-10 text-sage-500" />
          </div>
          <div>
            <h2 className="font-serif text-3xl text-stone-900 mb-2">
              You&rsquo;ve already checked in today!
            </h2>
            <p className="text-sm text-stone-400 max-w-sm mx-auto">
              Come back tomorrow to continue your streak. Your insights are updating in the background.
            </p>
          </div>

          {/* Mini summary of today's scores */}
          {existing.dimension_scores.length > 0 && (
            <Card className="max-w-sm mx-auto text-left">
              <p className="text-xs text-stone-400 uppercase tracking-wider mb-3 font-medium">Today&rsquo;s Snapshot</p>
              <div className="grid grid-cols-2 gap-2">
                {existing.dimension_scores.map((ds) => (
                  <div key={ds.dimension} className="flex items-center gap-2">
                    <div className="w-6 h-1.5 rounded-full bg-stone-100 overflow-hidden">
                      <div className="h-full rounded-full bg-sage-300" style={{ width: `${ds.score * 20}%` }} />
                    </div>
                    <span className="text-[11px] text-stone-500 capitalize">{ds.dimension}</span>
                    <span className="text-[11px] font-mono text-sage-500 ml-auto">{ds.score}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-7 py-3 rounded-2xl bg-gradient-to-r from-sage-500 to-sage-600 text-sm font-semibold text-white shadow-sm hover:shadow-md transition-all"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return <CheckInClient date={today} />;
}
