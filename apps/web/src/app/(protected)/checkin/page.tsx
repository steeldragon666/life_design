'use client';

import { useGuest } from '@/lib/guest-context';
import CheckInClient from './checkin-client';

export default function CheckInPage() {
  const { checkins } = useGuest();
  const today = new Date().toISOString().slice(0, 10);
  const existing = checkins.find(c => c.date === today);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-white tracking-tight mb-2">Daily Check-in</h1>
        <p className="text-slate-400">How are your life dimensions today?</p>
      </div>
      
      {existing ? (
        <div className="glass-card p-8 text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <p className="text-lg font-semibold text-white mb-1">
              You've already checked in today!
            </p>
            <p className="text-sm text-slate-400">
              Come back tomorrow to continue your streak
            </p>
          </div>
          <div className="pt-4 border-t border-white/5">
            <p className="text-xs text-slate-500">
              Checked in: {new Date(existing.date).toLocaleDateString()}
            </p>
          </div>
        </div>
      ) : (
        <CheckInClient date={today} />
      )}
    </div>
  );
}
