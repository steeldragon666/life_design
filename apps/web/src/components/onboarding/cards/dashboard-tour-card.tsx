'use client';

import { useState, useCallback } from 'react';

interface DashboardTourCardProps {
  onNext: () => void;
}

const DASHBOARD_FEATURES = [
  { icon: '🎯', name: 'Wheel of Life', description: 'Visual snapshot of all 8 dimensions' },
  { icon: '🔥', name: 'Streak Counter', description: 'Track your daily consistency' },
  { icon: '💡', name: 'AI Insights', description: 'Personalized patterns and correlations' },
  { icon: '📈', name: 'Trend Charts', description: 'See how each dimension changes over time' },
  { icon: '🔗', name: 'Correlation Cards', description: 'Discover hidden connections between areas' },
];

const GOAL_PRESETS = [
  { name: 'Get fitter', category: 'fitness', description: 'Improve physical health and activity levels' },
  { name: 'Advance career', category: 'career', description: 'Level up professionally and grow skills' },
  { name: 'Improve relationships', category: 'social', description: 'Strengthen connections with people who matter' },
  { name: 'Build a routine', category: 'growth', description: 'Create consistent daily habits' },
  { name: 'Reduce stress', category: 'health', description: 'Find more calm and balance in life' },
  { name: 'Save more money', category: 'finance', description: 'Build financial security and discipline' },
];

export default function DashboardTourCard({ onNext }: DashboardTourCardProps) {
  const [screen, setScreen] = useState<'tour' | 'goal'>('tour');
  const [goalName, setGoalName] = useState('');
  const [goalCategory, setGoalCategory] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSetGoal = useCallback(async () => {
    if (!goalName.trim()) return;
    setSubmitting(true);
    try {
      await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: goalName.trim(), category: goalCategory || 'growth' }),
      }).catch(() => {});

      await fetch('/api/onboarding/card', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ first_goal_created: true }),
      }).catch(() => {});

      onNext();
    } finally {
      setSubmitting(false);
    }
  }, [goalName, goalCategory, onNext]);

  if (screen === 'tour') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12 bg-gradient-to-b from-stone-50 to-stone-100">
        <div className="max-w-lg w-full space-y-8">
          <div className="text-center">
            <h2 className="font-serif text-3xl text-stone-900">Your dashboard</h2>
            <p className="text-stone-500 mt-3">Here's what you'll see every time you open Opt In.</p>
          </div>

          <div className="space-y-3">
            {DASHBOARD_FEATURES.map((feature) => (
              <div key={feature.name} className="flex items-center gap-4 p-4 bg-white rounded-xl border border-stone-100">
                <span className="text-2xl">{feature.icon}</span>
                <div>
                  <p className="font-medium text-sm text-stone-900">{feature.name}</p>
                  <p className="text-xs text-stone-500">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={() => setScreen('goal')}
            className="w-full py-4 rounded-2xl bg-stone-900 text-white font-medium text-lg hover:bg-stone-800 transition-colors"
          >
            Set your first goal
          </button>

          <button onClick={onNext} className="w-full text-sm text-stone-400 hover:text-stone-600 transition-colors">
            Skip for now
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12 bg-gradient-to-b from-stone-50 to-stone-100">
      <div className="max-w-lg w-full space-y-6">
        <div className="text-center">
          <h2 className="font-serif text-2xl text-stone-900">Set a goal</h2>
          <p className="text-stone-500 text-sm mt-1">What do you want to focus on?</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {GOAL_PRESETS.map((preset) => (
            <button
              key={preset.name}
              onClick={() => { setGoalName(preset.name); setGoalCategory(preset.category); }}
              className={`p-4 rounded-xl border text-left transition-all ${
                goalName === preset.name
                  ? 'bg-stone-900 text-white border-stone-900'
                  : 'bg-white border-stone-100 hover:border-stone-300'
              }`}
            >
              <p className={`font-medium text-sm ${goalName === preset.name ? 'text-white' : 'text-stone-900'}`}>{preset.name}</p>
              <p className={`text-xs mt-1 ${goalName === preset.name ? 'text-stone-300' : 'text-stone-500'}`}>{preset.description}</p>
            </button>
          ))}
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-2">Or write your own</label>
          <input
            type="text"
            value={goalName}
            onChange={(e) => { setGoalName(e.target.value); setGoalCategory('growth'); }}
            placeholder="e.g. Run a half marathon"
            className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-white text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-900/10"
          />
        </div>

        <button
          onClick={handleSetGoal}
          disabled={!goalName.trim() || submitting}
          className="w-full py-4 rounded-2xl bg-stone-900 text-white font-medium text-lg hover:bg-stone-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {submitting ? 'Saving...' : 'Set goal & continue'}
        </button>

        <button onClick={onNext} className="w-full text-sm text-stone-400 hover:text-stone-600 transition-colors">
          Skip for now
        </button>
      </div>
    </div>
  );
}
