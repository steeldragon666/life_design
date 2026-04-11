'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { Dimension } from '@life-design/core';
import { dimensionColor } from './tokens';
import DimensionBadge from './DimensionBadge';

interface InsightCardProps {
  headline: string;
  body: string;
  confidence?: number;
  dimension?: Dimension | string;
  actionLabel?: string;
  onAction?: () => void;
  onDismiss?: () => void;
  locked?: boolean;
  expandedContent?: string;
  className?: string;
}

/**
 * Glass card for displaying ML insights.
 * - Left accent bar in dimension colour
 * - Header: headline + confidence badge
 * - Body: 2-3 sentence narrative
 * - Footer: action button + dismiss
 * - Expand/collapse for full detail
 * - Lock overlay for churned users (blurred + lock icon)
 */
export default function InsightCard({
  headline,
  body,
  confidence,
  dimension,
  actionLabel = 'Explore',
  onAction,
  onDismiss,
  locked = false,
  expandedContent,
  className = '',
}: InsightCardProps) {
  const [expanded, setExpanded] = useState(false);
  const accentColor = dimension ? dimensionColor(dimension) : '#6366f1';

  return (
    <div
      className={`relative bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl shadow-xl overflow-hidden transition-all duration-300 hover:scale-[1.005] ${className}`}
    >
      {/* Left accent bar */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl"
        style={{ backgroundColor: accentColor }}
      />

      {/* Lock overlay for churned users */}
      {locked && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-2xl">
          <div className="text-center">
            <div className="text-3xl mb-2">{'\uD83D\uDD12'}</div>
            <p className="text-sm font-bold text-white/80">Upgrade to unlock insights</p>
          </div>
        </div>
      )}

      <div className={`p-5 pl-6 ${locked ? 'blur-sm pointer-events-none select-none' : ''}`}>
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1">
            <h3
              className="font-bold text-white tracking-tight leading-tight"
              style={{ fontFamily: '"Cabinet Grotesk", system-ui, sans-serif' }}
            >
              {headline}
            </h3>
            <div className="flex items-center gap-2 mt-1.5">
              {dimension && <DimensionBadge dimension={dimension} size="sm" />}
              {confidence !== undefined && (
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 bg-white/5 px-2 py-0.5 rounded-full">
                  {Math.round(confidence * 100)}% confidence
                </span>
              )}
            </div>
          </div>
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="p-1.5 rounded-lg hover:bg-white/10 text-slate-500 hover:text-white transition-all opacity-0 group-hover:opacity-100"
              aria-label="Dismiss insight"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Body */}
        <p
          className="text-sm text-slate-300 leading-relaxed"
          style={{ fontFamily: '"Erode", Georgia, serif' }}
        >
          {body}
        </p>

        {/* Expanded content */}
        {expandedContent && expanded && (
          <p
            className="text-sm text-slate-400 leading-relaxed mt-3 pt-3 border-t border-white/10"
            style={{ fontFamily: '"Erode", Georgia, serif' }}
          >
            {expandedContent}
          </p>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/5">
          <div className="flex items-center gap-2">
            {onAction && (
              <button
                onClick={onAction}
                className="text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                {actionLabel} &rarr;
              </button>
            )}
          </div>
          {expandedContent && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-[10px] font-bold uppercase tracking-wider text-slate-500 hover:text-white transition-colors"
            >
              {expanded ? 'Show less' : 'Show more'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
