'use client';

import { useState, useCallback } from 'react';

interface StreaksCardProps {
  onNext: () => void;
}

const CATEGORIES = [
  { value: 'health', label: 'Health', icon: '💚' },
  { value: 'fitness', label: 'Fitness', icon: '💪' },
  { value: 'growth', label: 'Growth', icon: '🌱' },
  { value: 'career', label: 'Career', icon: '💼' },
  { value: 'social', label: 'Social', icon: '👥' },
  { value: 'mindfulness', label: 'Mindfulness', icon: '🧘' },
];

const SUGGESTIONS = [
  { name: 'Meditate for 10 minutes', category: 'mindfulness' },
  { name: 'Read for 20 minutes', category: 'growth' },
  { name: 'Exercise for 30 minutes', category: 'fitness' },
  { name: 'Drink 8 glasses of water', category: 'health' },
  { name: 'Journal before bed', category: 'growth' },
  { name: 'No screens after 9pm', category: 'health' },
];

export default function StreaksCard({ onNext }: StreaksCardProps) {
  const [screen, setScreen] = useState<'intro' | 'create' | 'done'>('intro');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('health');
  const [submitting, setSubmitting] = useState(false);

  const handleCreate = useCallback(async () => {
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      await fetch('/api/streaks/custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), category }),
      }).catch(() => {});

      await fetch('/api/onboarding/card', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ first_streak_created: true }),
      }).catch(() => {});

      setScreen('done');
    } finally {
      setSubmitting(false);
    }
  }, [name, category]);

  if (screen === 'intro') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12 bg-gradient-to-b from-stone-50 to-stone-100">
        <div className="max-w-lg w-full space-y-8 text-center">
          <div>
            <div className="text-5xl mb-4">🔥</div>
            <h2 className="font-serif text-3xl text-stone-900">Streaks</h2>
            <p className="text-stone-500 mt-3">Build momentum with daily habits. Streaks track your consistency and help you stay on course.</p>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-stone-100">
            <div className="flex items-center justify-center gap-1 mb-3">
              {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                <div
                  key={day}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-medium ${
                    day <= 3 ? 'bg-orange-100 text-orange-700' : 'bg-stone-100 text-stone-400'
                  }`}
                >
                  {day <= 3 ? '✓' : day}
                </div>
              ))}
            </div>
            <p className="text-sm text-stone-600 font-medium">3 day streak</p>
            <p className="text-xs text-stone-400 mt-1">Check in daily to keep your streak alive</p>
          </div>

          <button
            onClick={() => setScreen('create')}
            className="w-full py-4 rounded-2xl bg-stone-900 text-white font-medium text-lg hover:bg-stone-800 transition-colors"
          >
            Create your first streak
          </button>

          <button onClick={onNext} className="text-sm text-stone-400 hover:text-stone-600 transition-colors">
            Skip for now
          </button>
        </div>
      </div>
    );
  }

  if (screen === 'create') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12 bg-gradient-to-b from-stone-50 to-stone-100">
        <div className="max-w-lg w-full space-y-6">
          <div className="text-center">
            <h2 className="font-serif text-2xl text-stone-900">Create a streak</h2>
            <p className="text-stone-500 text-sm mt-1">What habit do you want to build?</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">Streak name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Meditate for 10 minutes"
              className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-white text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-900/10"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">Suggestions</label>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s.name}
                  onClick={() => { setName(s.name); setCategory(s.category); }}
                  className="px-3 py-1.5 bg-white border border-stone-200 rounded-full text-xs text-stone-600 hover:border-stone-400 transition-colors"
                >
                  {s.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">Category</label>
            <div className="grid grid-cols-3 gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => setCategory(cat.value)}
                  className={`p-3 rounded-xl border text-center transition-all ${
                    category === cat.value
                      ? 'bg-stone-900 text-white border-stone-900'
                      : 'bg-white border-stone-200 text-stone-700 hover:border-stone-400'
                  }`}
                >
                  <span className="text-lg">{cat.icon}</span>
                  <p className="text-xs mt-1">{cat.label}</p>
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleCreate}
            disabled={!name.trim() || submitting}
            className="w-full py-4 rounded-2xl bg-stone-900 text-white font-medium text-lg hover:bg-stone-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting ? 'Creating...' : 'Create streak'}
          </button>
        </div>
      </div>
    );
  }

  // Done screen
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12 bg-gradient-to-b from-stone-50 to-stone-100">
      <div className="max-w-lg w-full space-y-8 text-center">
        <div className="text-5xl">✨</div>
        <div>
          <h2 className="font-serif text-3xl text-stone-900">Streak created!</h2>
          <p className="text-stone-500 mt-3">"{name}" is ready to track. Complete it daily to build your streak.</p>
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
