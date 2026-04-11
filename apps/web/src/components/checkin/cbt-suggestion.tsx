'use client';

import { useMemo, useState } from 'react';
import { matchTechniquesToMood } from '@life-design/core';
import type { MoodClassification, CBTTechnique } from '@life-design/core';
import { Card } from '@life-design/ui';

// ---------------------------------------------------------------------------
// Design tokens (stone/sage palette)
// ---------------------------------------------------------------------------

const SAGE = 'var(--color-sage-500)';
const MUTED = '#7D756A';
const BORDER = 'var(--color-stone-200)';
const BG = 'var(--color-stone-100)';
const DARK = 'var(--color-stone-900)';

// ---------------------------------------------------------------------------
// Category icons
// ---------------------------------------------------------------------------

const CATEGORY_ICON: Record<CBTTechnique['category'], string> = {
  cognitive_restructuring: '\u{1F4DD}',
  behavioural_activation: '\u{1F3AF}',
  mindfulness: '\u{1F9D8}',
  relaxation: '\u{1F32C}\uFE0F',
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface CBTSuggestionProps {
  mood: MoodClassification;
  maxSuggestions?: number;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CBTSuggestion({
  mood,
  maxSuggestions = 2,
}: CBTSuggestionProps) {
  const [activeTechnique, setActiveTechnique] = useState<string | null>(null);

  const techniques = useMemo(
    () => matchTechniquesToMood(mood).slice(0, maxSuggestions),
    [mood, maxSuggestions],
  );

  if (techniques.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-sm font-medium" style={{ color: DARK }}>
          Suggested techniques
        </span>
        <span className="text-xs" style={{ color: MUTED }}>
          based on your mood
        </span>
      </div>

      {techniques.map((technique) => {
        const isActive = activeTechnique === technique.id;

        return (
          <Card key={technique.id}>
            <div className="flex items-start gap-3">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0"
                style={{ backgroundColor: BG, border: `1px solid ${BORDER}` }}
              >
                {CATEGORY_ICON[technique.category]}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h3
                    className="text-sm font-medium truncate"
                    style={{ color: DARK }}
                  >
                    {technique.name}
                  </h3>
                  <span
                    className="text-xs shrink-0"
                    style={{ color: MUTED }}
                  >
                    {technique.duration}
                  </span>
                </div>

                <p className="text-xs leading-relaxed" style={{ color: MUTED }}>
                  {technique.description}
                </p>

                <button
                  type="button"
                  onClick={() =>
                    setActiveTechnique(isActive ? null : technique.id)
                  }
                  className="mt-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={{
                    backgroundColor: isActive ? SAGE : `${SAGE}15`,
                    color: isActive ? 'white' : SAGE,
                    border: `1px solid ${isActive ? SAGE : BORDER}`,
                  }}
                >
                  {isActive ? 'Started' : 'Try this'}
                </button>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
