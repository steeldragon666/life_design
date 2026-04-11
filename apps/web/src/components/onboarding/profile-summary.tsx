'use client';

import type { ProfileSummaryTemplate, PsychometricProfile } from '@life-design/core';
import PsychometricReport from './psychometric-report';

interface ProfileSummaryProps {
  userName: string;
  summary: ProfileSummaryTemplate;
  psychometric?: PsychometricProfile | null;
  psychometricNarrative?: string;
  onComplete: () => void;
}

const SUMMARY_LABELS: { key: keyof ProfileSummaryTemplate; label: string; icon: string }[] = [
  { key: 'strength', label: 'Your Strength', icon: '💪' },
  { key: 'friction', label: 'Your Friction', icon: '🔥' },
  { key: 'strategy', label: 'Recommended Strategy', icon: '🎯' },
  { key: 'this_week', label: 'This Week', icon: '📅' },
];

export default function ProfileSummary({
  userName,
  summary,
  psychometric,
  psychometricNarrative,
  onComplete,
}: ProfileSummaryProps) {
  if (psychometric) {
    return (
      <PsychometricReport
        profile={psychometric}
        narrative={psychometricNarrative ?? ''}
        userName={userName}
        onComplete={onComplete}
      />
    );
  }

  return (
    <div className="min-h-screen px-4 py-8 md:px-8">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-sage-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h1 className="font-serif text-3xl text-stone-900">
            {userName ? `Welcome, ${userName}` : 'Your Profile is Ready'}
          </h1>
          <p className="text-stone-400 text-sm mt-2">Here's what we learned about you</p>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-5 mb-6">
          {SUMMARY_LABELS.map(({ key, label, icon }) => (
            <div key={key}>
              <h2 className="text-xs font-medium text-stone-400 uppercase tracking-wider mb-1">
                {icon} {label}
              </h3>
              <p className="text-sm text-stone-900">{summary[key]}</p>
            </div>
          ))}
        </div>

        <button
          onClick={onComplete}
          className="w-full py-3 bg-stone-900 text-white rounded-xl text-sm font-medium hover:bg-stone-900/90 transition-colors"
        >
          Go to Dashboard
        </button>
      </div>
    </div>
  );
}
