'use client';

import type { StoredDigest } from '@/lib/digest/digest-generator';
import { Button } from '@life-design/ui';

interface WeeklyDigestViewProps {
  digest: StoredDigest;
  onClose: () => void;
}

const trendIndicator: Record<string, { label: string; color: string }> = {
  up: { label: '\u2191', color: 'text-sage-600' },
  down: { label: '\u2193', color: 'text-warm-500' },
  stable: { label: '\u2192', color: 'text-stone-400' },
};

export default function WeeklyDigestView({ digest, onClose }: WeeklyDigestViewProps) {
  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-heading text-lg text-stone-800">Weekly Digest</h2>
        <button
          onClick={onClose}
          className="text-stone-400 hover:text-stone-600 text-xl transition-colors"
          aria-label="Close digest"
        >
          &times;
        </button>
      </div>

      <p className="text-sm text-stone-500 mb-4">
        Week of {digest.weekStarting}
      </p>

      {/* Summary */}
      <p className="text-stone-700 mb-6 leading-relaxed">{digest.summary}</p>

      {/* Highlights */}
      {digest.highlights.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-medium text-stone-600 mb-2">Highlights</h3>
          <ul className="space-y-1.5">
            {digest.highlights.map((h, i) => (
              <li
                key={i}
                className="text-sm text-stone-600 flex items-start gap-2"
              >
                <span className="text-sage-500 mt-0.5">&bull;</span>
                <span>{h}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Dimension Summaries */}
      {digest.dimensionSummaries.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-medium text-stone-600 mb-3">
            Dimensions
          </h3>
          <div className="space-y-2">
            {digest.dimensionSummaries.map((ds) => {
              const trend = trendIndicator[ds.trend] ?? trendIndicator.stable;
              return (
                <div
                  key={ds.dimension}
                  className="flex items-center justify-between rounded-lg bg-stone-50 px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${trend.color}`}>
                      {trend.label}
                    </span>
                    <span className="text-sm text-stone-700 capitalize">
                      {ds.dimension}
                    </span>
                  </div>
                  <span className="text-sm font-mono text-sage-600">
                    {ds.avgScore}/5
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="pt-4 border-t border-stone-200">
        <Button variant="secondary" size="sm" onClick={onClose}>
          Close
        </Button>
      </div>
    </div>
  );
}
