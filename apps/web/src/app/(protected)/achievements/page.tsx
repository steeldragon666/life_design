'use client';

import { useEarnedBadges } from '@/lib/db/hooks';
import { BADGE_DEFINITIONS, type BadgeDefinition } from '@/lib/achievements/badge-definitions';
import { Check } from 'lucide-react';

function BadgeCard({ badge, earned }: { badge: BadgeDefinition; earned: boolean }) {
  return (
    <div
      className={`rounded-2xl border p-5 transition-all ${
        earned
          ? 'bg-white border-sage-200 shadow-sm'
          : 'bg-stone-50 border-stone-200/60 opacity-50'
      }`}
    >
      <div className="flex items-start gap-4">
        <div
          className={`h-14 w-14 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 ${
            earned
              ? 'bg-sage-500/[0.13] border border-sage-500/[0.27] shadow-sm'
              : 'grayscale'
          }`}
        >
          {badge.emoji}
        </div>
        <div className="min-w-0">
          <p className="font-serif text-base text-stone-800 leading-snug">
            {badge.name}
          </p>
          <p className="text-sm text-stone-500 mt-0.5">{badge.description}</p>
          {earned ? (
            <span className="inline-flex items-center gap-1 mt-2 text-xs font-medium text-sage-600 bg-sage-500/10 rounded-full px-2.5 py-0.5">
              <Check size={10} strokeWidth={2.5} aria-hidden="true" />
              Earned
            </span>
          ) : (
            <span className="inline-block mt-2 text-xs text-stone-400">Locked</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AchievementsPage() {
  const earnedBadges = useEarnedBadges();
  const earnedIds = new Set((earnedBadges ?? []).map((b) => b.badgeId));

  const categories = [
    { key: 'milestone', label: 'Milestones' },
    { key: 'streak', label: 'Streaks' },
    { key: 'exploration', label: 'Exploration' },
    { key: 'special', label: 'Special' },
  ] as const;

  return (
    <div className="min-h-screen bg-stone-50 pb-24">
      <div className="max-w-3xl mx-auto px-4 pt-10 space-y-8">
        <header>
          <h1 className="font-serif text-3xl text-stone-800">Badges</h1>
          <p className="mt-1 text-sm text-stone-500">
            Earn badges by checking in, building streaks, and exploring all dimensions.
          </p>
          {earnedBadges && (
            <p className="mt-2 text-xs text-sage-600 font-medium">
              {earnedIds.size} / {BADGE_DEFINITIONS.length} earned
            </p>
          )}
        </header>

        {categories.map(({ key, label }) => {
          const badges = BADGE_DEFINITIONS.filter((b) => b.category === key);
          if (badges.length === 0) return null;
          return (
            <section key={key} aria-labelledby={`${key}-heading`}>
              <h2
                id={`${key}-heading`}
                className="font-serif text-lg text-stone-800 mb-3"
              >
                {label}
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {badges.map((badge) => (
                  <BadgeCard
                    key={badge.id}
                    badge={badge}
                    earned={earnedIds.has(badge.id)}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
