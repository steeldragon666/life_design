'use client';

import { useState, useCallback } from 'react';
import { Clock, Activity, Sun, Zap } from 'lucide-react';

interface CheckInIntroCardProps {
  onNext: () => void;
}

type SubScreen = 'intro' | 'checkin' | 'celebration';

const DIMENSIONS = [
  { label: 'Career', color: 'bg-blue-100 text-blue-700' },
  { label: 'Finance', color: 'bg-emerald-100 text-emerald-700' },
  { label: 'Health', color: 'bg-red-100 text-red-700' },
  { label: 'Fitness', color: 'bg-orange-100 text-orange-700' },
  { label: 'Family', color: 'bg-pink-100 text-pink-700' },
  { label: 'Social', color: 'bg-violet-100 text-violet-700' },
  { label: 'Romance', color: 'bg-rose-100 text-rose-700' },
  { label: 'Growth', color: 'bg-amber-100 text-amber-700' },
];

export default function CheckInIntroCard({ onNext }: CheckInIntroCardProps) {
  const [screen, setScreen] = useState<SubScreen>('intro');
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);

  const handleRating = (dimension: string, value: number) => {
    setRatings((prev) => ({ ...prev, [dimension]: value }));
  };

  const handleSubmitCheckin = useCallback(async () => {
    setSubmitting(true);
    try {
      await fetch('/api/checkins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ratings, type: 'quick' }),
      }).catch(() => {});

      await fetch('/api/onboarding/card', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ first_checkin_completed: true }),
      }).catch(() => {});

      setScreen('celebration');
    } finally {
      setSubmitting(false);
    }
  }, [ratings]);

  if (screen === 'intro') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12 bg-gradient-to-b from-stone-50 to-stone-100">
        <div className="max-w-lg w-full space-y-8 text-center">
          <div>
            <h2 className="font-serif text-3xl text-stone-900">Daily check-ins</h2>
            <p className="text-stone-500 mt-3">The heart of Opt In. A quick daily pulse across 8 life dimensions.</p>
          </div>

          <div className="space-y-4 text-left">
            <div className="flex gap-3 items-start">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                <Clock size={16} className="text-blue-600" />
              </div>
              <div>
                <h3 className="font-medium text-sm text-stone-900">Takes under 60 seconds</h3>
                <p className="text-xs text-stone-500 mt-0.5">Rate each dimension 1-10. That's it.</p>
              </div>
            </div>
            <div className="flex gap-3 items-start">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                <Activity size={16} className="text-emerald-600" />
              </div>
              <div>
                <h3 className="font-medium text-sm text-stone-900">AI finds the patterns</h3>
                <p className="text-xs text-stone-500 mt-0.5">After 7 days, you'll start seeing correlations between dimensions.</p>
              </div>
            </div>
            <div className="flex gap-3 items-start">
              <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center flex-shrink-0">
                <Sun size={16} className="text-violet-600" />
              </div>
              <div>
                <h3 className="font-medium text-sm text-stone-900">Insights get smarter over time</h3>
                <p className="text-xs text-stone-500 mt-0.5">The more you check in, the more personalized your guidance becomes.</p>
              </div>
            </div>
          </div>

          <button
            onClick={() => setScreen('checkin')}
            className="w-full py-4 rounded-2xl bg-stone-900 text-white font-medium text-lg hover:bg-stone-800 transition-colors"
          >
            Try your first check-in
          </button>
        </div>
      </div>
    );
  }

  if (screen === 'checkin') {
    const allRated = Object.keys(ratings).length === DIMENSIONS.length;
    return (
      <div className="min-h-screen flex flex-col px-6 py-12 bg-gradient-to-b from-stone-50 to-stone-100">
        <div className="max-w-lg w-full mx-auto space-y-6">
          <div className="text-center">
            <h2 className="font-serif text-2xl text-stone-900">How's life right now?</h2>
            <p className="text-stone-500 text-sm mt-1">Rate each area 1-10</p>
          </div>

          <div className="space-y-4">
            {DIMENSIONS.map((dim) => (
              <div key={dim.label} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${dim.color}`}>{dim.label}</span>
                  <span className="text-sm font-medium text-stone-700">{ratings[dim.label] ?? '\u2014'}</span>
                </div>
                <div className="flex gap-1">
                  {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                    <button
                      key={n}
                      onClick={() => handleRating(dim.label, n)}
                      className={`flex-1 h-8 rounded-lg text-xs font-medium transition-all ${
                        ratings[dim.label] === n
                          ? 'bg-stone-900 text-white scale-110'
                          : ratings[dim.label] && ratings[dim.label] >= n
                            ? 'bg-stone-200 text-stone-600'
                            : 'bg-stone-100 text-stone-400 hover:bg-stone-200'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={handleSubmitCheckin}
            disabled={!allRated || submitting}
            className="w-full py-4 rounded-2xl bg-stone-900 text-white font-medium text-lg hover:bg-stone-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting ? 'Saving...' : 'Submit check-in'}
          </button>
        </div>
      </div>
    );
  }

  // Celebration screen
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12 bg-gradient-to-b from-stone-50 to-stone-100">
      <div className="max-w-lg w-full space-y-8 text-center">
        <div className="text-6xl">{'\u{1F389}'}</div>
        <div>
          <h2 className="font-serif text-3xl text-stone-900">First check-in complete!</h2>
          <p className="text-stone-500 mt-3">You've just taken the first step. Come back tomorrow to start building your streak.</p>
        </div>
        <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-full text-sm font-medium">
          <Zap size={16} />
          1 day streak started
        </div>
        <button
          onClick={onNext}
          className="w-full py-4 rounded-2xl bg-stone-900 text-white font-medium text-lg hover:bg-stone-800 transition-colors"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
