'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Dimension, DIMENSION_LABELS } from '@life-design/core';
import { useActiveChallenges } from '@/lib/db/hooks';
import { useChallenges } from '@/providers/LifeDesignProvider';
import { CHALLENGE_LIBRARY } from '@/lib/challenges/challenge-library';
import type { Challenge } from '@/lib/challenges/types';

// ---------------------------------------------------------------------------
// Dimension colour map
// ---------------------------------------------------------------------------

const DIMENSION_COLORS: Record<Dimension, string> = {
  [Dimension.Career]:  '#5E9BC4',
  [Dimension.Finance]: '#D4864A',
  [Dimension.Health]:  '#9BB89B',
  [Dimension.Fitness]: '#739A73',
  [Dimension.Family]:  '#E8A46D',
  [Dimension.Social]:  '#85B8D8',
  [Dimension.Romance]: '#8B7BA8',
  [Dimension.Growth]:  '#5A7F5A',
};

const DIFFICULTY_CONFIG = {
  beginner:     { label: 'Beginner',     dot: 'bg-[#9BB89B]', text: 'text-[#4A7A4A]' },
  intermediate: { label: 'Intermediate', dot: 'bg-[#D4864A]', text: 'text-[#A05A20]' },
  advanced:     { label: 'Advanced',     dot: 'bg-[#8B7BA8]', text: 'text-[#5E4E7A]' },
} as const;

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

function formatDuration(days: number): string {
  if (days === 1)  return '1 day';
  if (days < 7)    return `${days} days`;
  if (days === 7)  return '1 week';
  if (days === 14) return '2 weeks';
  if (days === 30) return '30 days';
  return `${days} days`;
}

function progressPercent(
  challengeId: string,
  taskCompletion: Record<string, boolean>,
): number {
  const challenge = CHALLENGE_LIBRARY.find((c) => c.id === challengeId);
  if (!challenge) return 0;
  const totalTasks = challenge.days.reduce((sum, d) => sum + d.tasks.length, 0);
  if (totalTasks === 0) return 0;
  const done = Object.values(taskCompletion).filter(Boolean).length;
  return Math.round((done / totalTasks) * 100);
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface ActiveChallengeRowProps {
  challengeId: string;
  activeId: number;
  taskCompletion: Record<string, boolean>;
}

function ActiveChallengeRow({ challengeId, activeId, taskCompletion }: ActiveChallengeRowProps) {
  const router = useRouter();
  const challenge = CHALLENGE_LIBRARY.find((c) => c.id === challengeId);
  if (!challenge) return null;

  const pct = progressPercent(challengeId, taskCompletion);
  const primaryColor = DIMENSION_COLORS[challenge.dimensions[0]] ?? '#5A7F5A';

  return (
    <div
      className="bg-white border border-[#E8E4DD]/60 rounded-2xl p-4 flex flex-col gap-3"
      style={{ borderLeftColor: primaryColor, borderLeftWidth: 4 }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-lg leading-none">{challenge.badge.icon}</span>
            <h3 className="font-['Instrument_Serif'] text-base text-[#2A2623] truncate">
              {challenge.title}
            </h3>
          </div>
          <p className="text-xs text-[#7D756A]">{pct}% complete</p>
        </div>
        <button
          onClick={() => router.push(`/challenges/${activeId}`)}
          className="shrink-0 rounded-xl px-4 py-1.5 text-xs font-medium text-white"
          style={{ background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}cc)` }}
        >
          Continue
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 w-full rounded-full bg-[#E8E4DD]">
        <div
          className="h-1.5 rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: primaryColor }}
        />
      </div>
    </div>
  );
}

interface ChallengeCardProps {
  challenge: Challenge;
  isActive: boolean;
  onStart: (challengeId: string) => Promise<void>;
  starting: boolean;
}

function ChallengeCard({ challenge, isActive, onStart, starting }: ChallengeCardProps) {
  const primaryColor = DIMENSION_COLORS[challenge.dimensions[0]] ?? '#5A7F5A';
  const diff = DIFFICULTY_CONFIG[challenge.difficulty];

  return (
    <article
      className="bg-white border border-[#E8E4DD]/60 rounded-2xl overflow-hidden flex flex-col"
      style={{ borderLeftColor: primaryColor, borderLeftWidth: 4 }}
    >
      {/* Card body */}
      <div className="flex-1 p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <h3 className="font-['Instrument_Serif'] text-lg leading-tight text-[#2A2623]">
            {challenge.title}
          </h3>
          {/* Duration badge */}
          <span
            className="shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium text-white"
            style={{ backgroundColor: primaryColor }}
          >
            {formatDuration(challenge.durationDays)}
          </span>
        </div>

        <p className="text-sm text-[#7D756A] leading-relaxed mb-4">
          {challenge.description}
        </p>

        {/* Dimension pills */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {challenge.dimensions.map((dim) => (
            <span
              key={dim}
              className="rounded-full px-2.5 py-0.5 text-xs font-medium text-white"
              style={{ backgroundColor: DIMENSION_COLORS[dim] }}
            >
              {DIMENSION_LABELS[dim]}
            </span>
          ))}
        </div>

        {/* Difficulty + badge preview */}
        <div className="flex items-center justify-between">
          {/* Difficulty */}
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${diff.dot}`} />
            <span className={`text-xs font-medium ${diff.text}`}>{diff.label}</span>
          </div>

          {/* Badge preview */}
          <div className="flex items-center gap-1.5">
            <span
              className="flex items-center justify-center w-6 h-6 rounded-full text-sm"
              style={{ backgroundColor: `${challenge.badge.color}22` }}
              title={challenge.badge.description}
            >
              {challenge.badge.icon}
            </span>
            <span className="text-xs text-[#A8A198]">{challenge.badge.name}</span>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="px-5 pb-5">
        {isActive ? (
          <div className="w-full rounded-xl py-2.5 text-center text-sm font-medium text-[#7D756A] bg-[#F0EDE8]">
            Already Active
          </div>
        ) : (
          <button
            disabled={starting}
            onClick={() => onStart(challenge.id)}
            className="w-full rounded-xl py-2.5 text-sm font-medium text-white transition-opacity disabled:opacity-60"
            style={{
              background: `linear-gradient(135deg, #5A7F5A, #476447)`,
            }}
          >
            {starting ? 'Starting…' : 'Start Challenge'}
          </button>
        )}
      </div>
    </article>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function ChallengeLibrary() {
  const router                  = useRouter();
  const engine                  = useChallenges();
  const activeChallenges        = useActiveChallenges();
  const [filter, setFilter]     = useState<Dimension | null>(null);
  const [startingId, setStartingId] = useState<string | null>(null);
  const [error, setError]       = useState<string | null>(null);

  const activeChallengeIds = new Set(
    (activeChallenges ?? []).map((ac) => ac.challengeId),
  );

  const filteredChallenges: Challenge[] =
    filter === null
      ? CHALLENGE_LIBRARY
      : CHALLENGE_LIBRARY.filter((c) => c.dimensions.includes(filter));

  async function handleStart(challengeId: string) {
    setError(null);
    setStartingId(challengeId);
    try {
      const newId  = await engine.startChallenge(challengeId);
      router.push(`/challenges/${newId}`);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to start challenge.';
      setError(message);
      setStartingId(null);
    }
  }

  return (
    <div className="min-h-screen bg-[#FAFAF8] pb-24">
      <div className="max-w-3xl mx-auto px-4 pt-10 space-y-8">

        {/* Page header */}
        <header>
          <h1 className="font-['Instrument_Serif'] text-3xl text-[#2A2623]">
            Challenges
          </h1>
          <p className="mt-1 text-sm text-[#7D756A]">
            Structured programs to level up specific areas of your life.
          </p>
        </header>

        {/* Error banner */}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
            <button
              onClick={() => setError(null)}
              className="ml-3 text-xs underline opacity-70 hover:opacity-100"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Active challenges */}
        {activeChallenges && activeChallenges.length > 0 && (
          <section aria-labelledby="active-challenges-heading">
            <h2
              id="active-challenges-heading"
              className="font-['Instrument_Serif'] text-lg text-[#2A2623] mb-3"
            >
              In Progress
            </h2>
            <div className="space-y-3">
              {activeChallenges.map((ac) => (
                <ActiveChallengeRow
                  key={ac.id}
                  challengeId={ac.challengeId}
                  activeId={ac.id!}
                  taskCompletion={ac.taskCompletion}
                />
              ))}
            </div>
          </section>
        )}

        {/* Dimension filter */}
        <section aria-label="Filter challenges by dimension">
          <div
            className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide"
            role="group"
            aria-label="Dimension filters"
          >
            {/* All pill */}
            <button
              onClick={() => setFilter(null)}
              className={[
                'shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-all',
                filter === null
                  ? 'text-white bg-[#5A7F5A]'
                  : 'text-[#7D756A] bg-white border border-[#E8E4DD]',
              ].join(' ')}
            >
              All
            </button>

            {Object.values(Dimension).map((dim) => {
              const active = filter === dim;
              const color  = DIMENSION_COLORS[dim];
              return (
                <button
                  key={dim}
                  onClick={() => setFilter(active ? null : dim)}
                  className={[
                    'shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-all border',
                    active ? 'text-white' : 'text-[#7D756A] bg-white',
                  ].join(' ')}
                  style={
                    active
                      ? { backgroundColor: color, borderColor: color }
                      : { borderColor: '#E8E4DD' }
                  }
                >
                  {DIMENSION_LABELS[dim]}
                </button>
              );
            })}
          </div>
        </section>

        {/* Challenge grid */}
        <section aria-label="Challenge library">
          {filteredChallenges.length === 0 ? (
            <p className="py-12 text-center text-sm text-[#A8A198]">
              No challenges found for this dimension yet.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {filteredChallenges.map((challenge) => (
                <ChallengeCard
                  key={challenge.id}
                  challenge={challenge}
                  isActive={activeChallengeIds.has(challenge.id)}
                  onStart={handleStart}
                  starting={startingId === challenge.id}
                />
              ))}
            </div>
          )}
        </section>

      </div>
    </div>
  );
}
