'use client';

import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/db';
import { useChallenges } from '@/providers/LifeDesignProvider';
import { getChallengeById } from '@/lib/challenges/challenge-library';
import type { ChallengeTask } from '@/lib/challenges/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TASK_TYPE_ICONS: Record<string, string> = {
  check_in: '📊',
  action: '⚡',
  reflection: '✍️',
  score_target: '🎯',
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface ProgressRingProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
}

function ProgressRing({ percentage, size = 120, strokeWidth = 10 }: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <svg width={size} height={size} className="-rotate-90" aria-label={`${percentage}% complete`}>
      {/* Track */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="var(--color-stone-200, #E8E4DD)"
        strokeWidth={strokeWidth}
      />
      {/* Progress */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="url(#ringGradient)"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 0.6s ease' }}
      />
      <defs>
        <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#5A7F5A" />
          <stop offset="100%" stopColor="#476447" />
        </linearGradient>
      </defs>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface ActiveChallengeViewProps {
  activeChallengeId: number;
}

export default function ActiveChallengeView({ activeChallengeId }: ActiveChallengeViewProps) {
  const router = useRouter();
  const engine = useChallenges();
  const [completingTask, setCompletingTask] = useState<string | null>(null);
  const [isAbandoning, setIsAbandoning] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  const active = useLiveQuery(
    () => db.activeChallenges.get(activeChallengeId),
    [activeChallengeId],
  );

  // -------------------------------------------------------------------------
  // Loading state
  // -------------------------------------------------------------------------

  if (active === undefined) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div
            className="h-10 w-10 rounded-full border-2 border-sage-500 border-t-transparent animate-spin"
            aria-label="Loading challenge"
          />
          <p className="text-stone-500 text-sm">Loading challenge...</p>
        </div>
      </div>
    );
  }

  // Not found
  if (!active) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-stone-800 font-serif text-xl mb-2">Challenge not found</p>
          <button
            onClick={() => router.push('/challenges')}
            className="text-sage-500 underline text-sm"
          >
            Back to challenges
          </button>
        </div>
      </div>
    );
  }

  const challenge = getChallengeById(active.challengeId);

  if (!challenge) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-stone-800 font-serif text-xl mb-2">Challenge data unavailable</p>
          <button
            onClick={() => router.push('/challenges')}
            className="text-sage-500 underline text-sm"
          >
            Back to challenges
          </button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Derived data
  // -------------------------------------------------------------------------

  const progress = engine.getProgress(active);
  const todaysResult = engine.getTodaysTasks(active);

  // Current day number (1-based) relative to start date
  const startMs = new Date(active.startDate + 'T12:00:00Z').getTime();
  const nowMs = new Date(new Date().toISOString().slice(0, 10) + 'T12:00:00Z').getTime();
  const currentDayNumber = Math.floor((nowMs - startMs) / 86400000) + 1;

  // Streak: count consecutive days from today backwards where all tasks done
  function computeStreak(): number {
    if (!challenge || !active) return 0;
    let streak = 0;
    for (let d = currentDayNumber; d >= 1; d--) {
      const day = challenge.days.find((cd) => cd.day === d);
      if (!day) break;
      const allDone = day.tasks.every((t) => active.taskCompletion[t.id] === true);
      if (allDone) {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  }

  const streak = computeStreak();

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  async function handleCompleteTask(taskId: string) {
    if (completingTask) return;
    setCompletingTask(taskId);
    try {
      await engine.completeTask(activeChallengeId, taskId);
    } finally {
      setCompletingTask(null);
    }
  }

  async function handleAbandon() {
    const confirmed = window.confirm(
      `Are you sure you want to abandon "${challenge?.title}"? Your progress will be lost.`,
    );
    if (!confirmed) return;
    setIsAbandoning(true);
    try {
      await engine.abandonChallenge(activeChallengeId);
      router.push('/challenges');
    } finally {
      setIsAbandoning(false);
    }
  }

  async function handleComplete() {
    setIsCompleting(true);
    try {
      await engine.completeChallenge(activeChallengeId);
      router.push('/challenges');
    } finally {
      setIsCompleting(false);
    }
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-stone-50">
      {/* ------------------------------------------------------------------ */}
      {/* Header                                                               */}
      {/* ------------------------------------------------------------------ */}
      <header className="sticky top-0 z-10 bg-stone-50/95 backdrop-blur-sm border-b border-stone-200/60 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button
            onClick={() => router.push('/challenges')}
            aria-label="Back to challenges"
            className="flex items-center justify-center h-9 w-9 rounded-xl border border-stone-200/60 bg-white text-stone-500 hover:text-stone-800 hover:border-sage-500/40 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path
                d="M10 3L5 8L10 13"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-serif text-xl text-stone-800 leading-tight truncate">
              {challenge.title}
            </h1>
            <p className="text-xs text-stone-500 mt-0.5 capitalize">
              {challenge.difficulty} · {challenge.durationDays} days
            </p>
          </div>
          {/* Streak pill in header */}
          {streak > 0 && (
            <div className="flex items-center gap-1.5 bg-orange-50 border border-orange-200/60 rounded-full px-3 py-1">
              <span className="text-sm" aria-hidden="true">🔥</span>
              <span className="text-xs font-semibold text-orange-700">{streak}</span>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">

        {/* ---------------------------------------------------------------- */}
        {/* Progress ring + stats row                                         */}
        {/* ---------------------------------------------------------------- */}
        <section
          className="bg-white border border-stone-200/60 rounded-2xl p-5"
          aria-label="Overall progress"
        >
          <div className="flex items-center gap-6">
            {/* SVG ring */}
            <div className="relative flex-shrink-0 flex items-center justify-center">
              <ProgressRing percentage={progress.percentage} size={108} strokeWidth={9} />
              {/* Centered label */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-stone-800 leading-none">
                  {progress.percentage}
                </span>
                <span className="text-[11px] font-medium text-stone-500 uppercase tracking-wider mt-0.5">
                  %
                </span>
              </div>
            </div>

            {/* Stats */}
            <div className="flex-1 space-y-3">
              <div>
                <p className="text-xs text-stone-500 uppercase tracking-wider mb-1">Days</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 rounded-full bg-stone-200/60">
                    <div
                      className="h-2 rounded-full bg-gradient-to-r from-sage-500 to-sage-600 transition-all duration-500"
                      style={{
                        width: `${progress.totalDays > 0 ? (progress.completedDays / progress.totalDays) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  <span className="text-xs text-stone-500 whitespace-nowrap">
                    {progress.completedDays}/{progress.totalDays}
                  </span>
                </div>
              </div>
              <div>
                <p className="text-xs text-stone-500 uppercase tracking-wider mb-1">Tasks</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 rounded-full bg-stone-200/60">
                    <div
                      className="h-2 rounded-full bg-gradient-to-r from-sage-500 to-sage-600 transition-all duration-500"
                      style={{
                        width: `${progress.totalTasks > 0 ? (progress.completedTasks / progress.totalTasks) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  <span className="text-xs text-stone-500 whitespace-nowrap">
                    {progress.completedTasks}/{progress.totalTasks}
                  </span>
                </div>
              </div>

              {/* Streak indicator */}
              <div className="flex items-center gap-2 pt-0.5">
                <span className="text-base" aria-hidden="true">🔥</span>
                <div>
                  <span className="text-sm font-semibold text-stone-800">{streak}</span>
                  <span className="text-xs text-stone-500 ml-1">
                    {streak === 1 ? 'day streak' : 'day streak'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Day timeline                                                       */}
        {/* ---------------------------------------------------------------- */}
        <section aria-label="Day timeline">
          <h2 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3 px-0.5">
            Timeline
          </h2>
          <div className="overflow-x-auto pb-2" style={{ WebkitOverflowScrolling: 'touch' }}>
            <div className="flex flex-nowrap gap-2 w-max">
              {challenge.days.map((day) => {
                const isCurrentDay = day.day === currentDayNumber;
                const isPastDay = day.day < currentDayNumber;
                const isFutureDay = day.day > currentDayNumber;
                const allTasksDone = day.tasks.every(
                  (t) => active.taskCompletion[t.id] === true,
                );
                const isCompleted = (isPastDay || isCurrentDay) && allTasksDone;

                let circleClass =
                  'h-11 w-11 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-all flex-shrink-0 ';

                if (isCurrentDay) {
                  circleClass +=
                    'bg-gradient-to-br from-sage-500 to-sage-600 border-sage-500 text-white shadow-lg shadow-sage-500/30 scale-110';
                } else if (isCompleted) {
                  circleClass +=
                    'bg-sage-500/10 border-sage-500/40 text-sage-500';
                } else if (isFutureDay) {
                  circleClass +=
                    'bg-white border-stone-200/60 text-stone-500';
                } else {
                  // Past, incomplete
                  circleClass +=
                    'bg-stone-200/40 border-stone-200 text-stone-500';
                }

                return (
                  <div key={day.day} className="flex flex-col items-center gap-1.5">
                    <div className={circleClass} aria-label={`Day ${day.day}${isCurrentDay ? ' (today)' : ''}${isCompleted ? ', completed' : ''}`}>
                      {isCompleted && !isCurrentDay ? (
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                          <path
                            d="M3 8.5L6.5 12L13 5"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      ) : (
                        <span>{day.day}</span>
                      )}
                    </div>
                    {isCurrentDay && (
                      <div className="h-1 w-1 rounded-full bg-sage-500" aria-hidden="true" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Today's tasks                                                      */}
        {/* ---------------------------------------------------------------- */}
        {todaysResult ? (
          <section
            className="bg-white border border-stone-200/60 rounded-2xl overflow-hidden"
            aria-label="Today's tasks"
          >
            <div className="px-5 py-4 border-b border-stone-200/60 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                  Day {todaysResult.day.day}
                </p>
                <h2 className="font-serif text-lg text-stone-800 leading-snug mt-0.5">
                  {todaysResult.day.title}
                </h2>
              </div>
              <div className="text-xs text-stone-500 bg-stone-50 border border-stone-200/60 rounded-full px-3 py-1 whitespace-nowrap">
                {todaysResult.tasks.filter((t) => active.taskCompletion[t.id]).length}/
                {todaysResult.tasks.length} done
              </div>
            </div>

            <ul className="divide-y divide-stone-200/40" role="list">
              {todaysResult.tasks.map((task: ChallengeTask) => {
                const isDone = active.taskCompletion[task.id] === true;
                const isProcessing = completingTask === task.id;

                return (
                  <li key={task.id} className="px-5 py-4">
                    <label className="flex items-start gap-4 cursor-pointer group">
                      {/* Checkbox */}
                      <div className="mt-0.5 flex-shrink-0">
                        <input
                          type="checkbox"
                          checked={isDone}
                          disabled={isDone || isProcessing}
                          onChange={() => handleCompleteTask(task.id)}
                          className="sr-only"
                          aria-label={task.title}
                        />
                        <div
                          onClick={() => !isDone && !isProcessing && handleCompleteTask(task.id)}
                          role="checkbox"
                          aria-checked={isDone}
                          aria-label={task.title}
                          tabIndex={isDone ? -1 : 0}
                          onKeyDown={(e) => {
                            if ((e.key === 'Enter' || e.key === ' ') && !isDone && !isProcessing) {
                              e.preventDefault();
                              handleCompleteTask(task.id);
                            }
                          }}
                          className={[
                            'h-5 w-5 rounded-md border-2 flex items-center justify-center transition-all',
                            isDone
                              ? 'bg-gradient-to-br from-sage-500 to-sage-600 border-sage-500'
                              : isProcessing
                              ? 'border-sage-500/40 bg-sage-500/5 animate-pulse'
                              : 'border-stone-200 bg-white group-hover:border-sage-500/50',
                          ].join(' ')}
                        >
                          {isDone && (
                            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                              <path
                                d="M1.5 5.5L4 8L8.5 2"
                                stroke="white"
                                strokeWidth="1.75"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          )}
                        </div>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={[
                              'text-sm font-semibold leading-snug transition-colors',
                              isDone ? 'text-stone-500 line-through' : 'text-stone-800',
                            ].join(' ')}
                          >
                            {task.title}
                          </span>
                          <span
                            className="text-xs px-2 py-0.5 rounded-full bg-stone-50 border border-stone-200/60 text-stone-500"
                            aria-label={`Task type: ${task.type.replace('_', ' ')}`}
                          >
                            {TASK_TYPE_ICONS[task.type]} {task.type.replace('_', ' ')}
                          </span>
                        </div>
                        <p
                          className={[
                            'text-sm mt-1 leading-relaxed transition-colors',
                            isDone ? 'text-stone-500' : 'text-stone-500',
                          ].join(' ')}
                        >
                          {task.description}
                        </p>
                      </div>
                    </label>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : (
          <section className="bg-white border border-stone-200/60 rounded-2xl px-5 py-6 text-center">
            <p className="text-3xl mb-2" aria-hidden="true">
              {currentDayNumber > challenge.durationDays ? '🏁' : '⏳'}
            </p>
            <p className="font-serif text-lg text-stone-800">
              {currentDayNumber > challenge.durationDays
                ? 'All days completed!'
                : 'No tasks available for today'}
            </p>
            <p className="text-sm text-stone-500 mt-1">
              {currentDayNumber > challenge.durationDays
                ? 'Complete the challenge below to earn your badge.'
                : 'Check back once the challenge has started.'}
            </p>
          </section>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Complete challenge CTA                                             */}
        {/* ---------------------------------------------------------------- */}
        {progress.percentage === 100 && active.status === 'active' && (
          <section
            className="bg-gradient-to-br from-sage-500/10 to-sage-600/5 border border-sage-500/30 rounded-2xl px-5 py-5"
            aria-label="Complete challenge"
          >
            <div className="flex items-start gap-3 mb-4">
              <span className="text-2xl" aria-hidden="true">🎉</span>
              <div>
                <h3 className="font-serif text-lg text-stone-800">
                  All tasks complete!
                </h3>
                <p className="text-sm text-stone-500 mt-0.5">
                  You&apos;ve finished every task in this challenge. Mark it complete to earn your badge.
                </p>
              </div>
            </div>
            <button
              onClick={handleComplete}
              disabled={isCompleting}
              className="w-full bg-gradient-to-r from-sage-500 to-sage-600 text-white font-semibold py-3 rounded-xl transition-all hover:opacity-90 hover:shadow-lg hover:shadow-sage-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCompleting ? 'Completing...' : 'Complete Challenge'}
            </button>
          </section>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Badge preview                                                      */}
        {/* ---------------------------------------------------------------- */}
        <section
          className="bg-white border border-stone-200/60 rounded-2xl px-5 py-4"
          aria-label="Badge reward preview"
        >
          <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3">
            Badge Reward
          </p>
          <div className="flex items-center gap-4">
            <div
              className="h-14 w-14 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 shadow-sm"
              style={{ backgroundColor: challenge.badge.color + '22', border: `1.5px solid ${challenge.badge.color}44` }}
              aria-hidden="true"
            >
              {challenge.badge.icon}
            </div>
            <div className="min-w-0">
              <p
                className="font-semibold text-stone-800 leading-snug font-serif"
              >
                {challenge.badge.name}
              </p>
              <p className="text-sm text-stone-500 mt-0.5 leading-snug">
                {challenge.badge.description}
              </p>
              {active.status === 'completed' ? (
                <span className="inline-flex items-center gap-1 mt-1.5 text-xs font-medium text-sage-500 bg-sage-500/10 rounded-full px-2.5 py-0.5">
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                    <path d="M1.5 5.5L4 8L8.5 2" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Earned
                </span>
              ) : (
                <span className="inline-block mt-1.5 text-xs text-stone-500">
                  Complete the challenge to unlock
                </span>
              )}
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Abandon button                                                     */}
        {/* ---------------------------------------------------------------- */}
        {active.status === 'active' && (
          <div className="pt-2 pb-8">
            <button
              onClick={handleAbandon}
              disabled={isAbandoning}
              className="w-full py-3 rounded-xl border border-red-200/80 text-red-500 text-sm font-medium bg-white hover:bg-red-50 hover:border-red-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Abandon this challenge"
            >
              {isAbandoning ? 'Abandoning...' : 'Abandon Challenge'}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
