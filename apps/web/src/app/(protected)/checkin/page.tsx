'use client';

import Link from 'next/link';
import { useGuest } from '@/lib/guest-context';
import CheckInClient from './checkin-client';

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

export default function CheckInPage() {
  const { checkins } = useGuest();
  const today = new Date().toISOString().slice(0, 10);
  const existing = checkins.find(c => c.date === today);

  if (existing) {
    return (
      <div className="px-5 lg:px-10 py-6 lg:py-8 max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="font-['Instrument_Serif'] text-3xl lg:text-4xl text-[#1A1816]">Daily Check-in</h1>
          <p className="text-sm text-[#A8A198] mt-1">Take a moment to reflect on your day</p>
        </div>

        <div className="text-center py-12 space-y-6">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#E4ECE4] to-[#C4D5C4] flex items-center justify-center mx-auto">
            <CheckCircleIcon className="w-10 h-10 text-[#5A7F5A]" />
          </div>
          <div>
            <h2 className="font-['Instrument_Serif'] text-3xl text-[#1A1816] mb-2">
              You&rsquo;ve already checked in today!
            </h2>
            <p className="text-sm text-[#A8A198] max-w-sm mx-auto">
              Come back tomorrow to continue your streak. Your insights are updating in the background.
            </p>
          </div>

          {/* Mini summary of today's scores */}
          {existing.dimension_scores.length > 0 && (
            <div className="p-6 rounded-2xl bg-white border border-[#E8E4DD]/60 max-w-sm mx-auto text-left">
              <p className="text-xs text-[#A8A198] uppercase tracking-wider mb-3 font-medium">Today&rsquo;s Snapshot</p>
              <div className="grid grid-cols-2 gap-2">
                {existing.dimension_scores.map((ds) => (
                  <div key={ds.dimension} className="flex items-center gap-2">
                    <div className="w-6 h-1.5 rounded-full bg-[#F5F3EF] overflow-hidden">
                      <div className="h-full rounded-full bg-[#9BB89B]" style={{ width: `${ds.score * 10}%` }} />
                    </div>
                    <span className="text-[11px] text-[#7D756A] capitalize">{ds.dimension}</span>
                    <span className="text-[10px] font-['DM_Mono'] text-[#5A7F5A] ml-auto">{ds.score}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-[#5A7F5A] to-[#476447] text-sm font-medium text-white shadow-sm hover:shadow-md transition-all"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return <CheckInClient date={today} />;
}
