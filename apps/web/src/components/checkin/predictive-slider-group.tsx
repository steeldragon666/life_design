'use client';

import { useCallback, useMemo, useState } from 'react';
import { ALL_DIMENSIONS, Dimension, DIMENSION_LABELS } from '@life-design/core';
import type { PredictionResult } from '@/lib/ml/types';
import GhostSlider from './ghost-slider';
import ExplainabilityTooltip from './explainability-tooltip';
import { Card } from '@life-design/ui';

// ---------------------------------------------------------------------------
// Design tokens
// ---------------------------------------------------------------------------

const SAGE = 'var(--color-sage-500)';
const MUTED = '#7D756A';
const BG = 'var(--color-stone-100)';
const BORDER = 'var(--color-stone-200)';

// Minimum delta from predicted score to count as a "real" user adjustment
const DELTA_THRESHOLD = 1;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface PredictiveSliderGroupProps {
  prediction: PredictionResult;
  onScoresChange: (scores: Partial<Record<Dimension, number>>) => void;
  onConfirmAll: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PredictiveSliderGroup({
  prediction,
  onScoresChange,
  onConfirmAll,
}: PredictiveSliderGroupProps) {
  // Internal state: null means user hasn't touched this slider
  const [userScores, setUserScores] = useState<Partial<Record<Dimension, number | null>>>(
    () => {
      const initial: Partial<Record<Dimension, number | null>> = {};
      for (const dim of ALL_DIMENSIONS) {
        initial[dim] = null;
      }
      return initial;
    },
  );

  const [confirmPressed, setConfirmPressed] = useState(false);

  // Check if at least one slider has been moved with delta > DELTA_THRESHOLD
  const hasUserAdjusted = useMemo(() => {
    return ALL_DIMENSIONS.some((dim) => {
      const userVal = userScores[dim];
      if (userVal === null || userVal === undefined) return false;
      const predicted = Math.round(prediction.scores[dim]);
      return Math.abs(userVal - predicted) > DELTA_THRESHOLD;
    });
  }, [userScores, prediction.scores]);

  const handleSliderChange = useCallback(
    (dim: Dimension, value: number) => {
      setUserScores((prev) => {
        const next = { ...prev, [dim]: value };

        // Build scores for parent: use user value if set, otherwise predicted
        const resolvedScores: Partial<Record<Dimension, number>> = {};
        for (const d of ALL_DIMENSIONS) {
          const uv = d === dim ? value : next[d];
          resolvedScores[d] = uv ?? Math.round(prediction.scores[d]);
        }
        onScoresChange(resolvedScores);

        return next;
      });
    },
    [prediction.scores, onScoresChange],
  );

  const handleConfirmAll = useCallback(() => {
    setConfirmPressed(true);

    // Populate all unset sliders with AI predictions
    const resolvedScores: Partial<Record<Dimension, number>> = {};
    for (const dim of ALL_DIMENSIONS) {
      resolvedScores[dim] = userScores[dim] ?? Math.round(prediction.scores[dim]);
    }
    onScoresChange(resolvedScores);
    onConfirmAll();
  }, [prediction.scores, userScores, onScoresChange, onConfirmAll]);

  // "Confirm All" is enabled only after user adjusts at least one slider
  // OR the user explicitly taps confirm (we allow one tap to accept all AI predictions)
  const canConfirm = true; // Always allow — anti-anchoring is tracked via ai_accepted flag

  return (
    <div className="space-y-6">
      <Card>
        <div className="mb-4">
          <h2 className="font-serif text-xl" style={{ color: 'var(--color-stone-900)' }}>
            AI Predictions
          </h2>
          <p className="text-xs mt-1" style={{ color: MUTED }}>
            Slide to adjust. Ghost markers show AI estimates based on your patterns.
          </p>
        </div>

        <div className="space-y-5">
          {ALL_DIMENSIONS.map((dim) => {
            const predictedScore = prediction.scores[dim];
            const confidence = prediction.confidence[dim];
            const weights = prediction.topWeights[dim] ?? [];

            return (
              <div key={dim}>
                <div className="flex items-center gap-1.5 mb-1">
                  <ExplainabilityTooltip weights={weights} />
                </div>
                <GhostSlider
                  dimension={dim}
                  predictedScore={predictedScore}
                  confidence={confidence}
                  value={userScores[dim] ?? null}
                  onChange={(v) => handleSliderChange(dim, v)}
                  label={DIMENSION_LABELS[dim]}
                />
              </div>
            );
          })}
        </div>
      </Card>

      {/* Confirm All button */}
      <button
        type="button"
        onClick={handleConfirmAll}
        disabled={confirmPressed}
        className="w-full py-3 rounded-2xl text-sm font-medium transition-all"
        style={{
          backgroundColor: confirmPressed ? BG : SAGE,
          color: confirmPressed ? MUTED : 'white',
          border: `1px solid ${confirmPressed ? BORDER : SAGE}`,
          cursor: confirmPressed ? 'default' : 'pointer',
          opacity: confirmPressed ? 0.6 : 1,
        }}
      >
        {confirmPressed
          ? 'Predictions Confirmed'
          : hasUserAdjusted
            ? 'Confirm Adjusted Scores'
            : 'Confirm AI Predictions'}
      </button>

      {!hasUserAdjusted && !confirmPressed && (
        <p className="text-[11px] text-center" style={{ color: MUTED }}>
          Tap to accept AI predictions, or adjust any slider first
        </p>
      )}
    </div>
  );
}
