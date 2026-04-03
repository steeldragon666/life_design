'use client';

import { SECTIONS } from '@/lib/profiling/question-schema';
import type { ProfilingSection } from '@life-design/core';

interface ProgressBarProps {
  currentSection: ProfilingSection;
  currentQuestionInSection: number;
  totalInSection: number;
}

const ALL_SEGMENTS = [...SECTIONS.map((s) => s.id), 'mentors', 'summary'] as const;

export default function ProgressBar({ currentSection, currentQuestionInSection, totalInSection }: ProgressBarProps) {
  const currentSegmentIndex = ALL_SEGMENTS.indexOf(currentSection);

  return (
    <div className="flex gap-1.5 w-full" role="progressbar" aria-label="Onboarding progress">
      {ALL_SEGMENTS.map((segment, i) => {
        const isComplete = i < currentSegmentIndex;
        const isCurrent = i === currentSegmentIndex;
        const fillPercent = isCurrent
          ? Math.round(((currentQuestionInSection + 1) / totalInSection) * 100)
          : 0;

        return (
          <div
            key={segment}
            className="flex-1 h-1.5 rounded-full bg-stone-200 overflow-hidden"
          >
            <div
              className="h-full rounded-full bg-stone-900 transition-all duration-300"
              style={{ width: isComplete ? '100%' : isCurrent ? `${fillPercent}%` : '0%' }}
            />
          </div>
        );
      })}
    </div>
  );
}
