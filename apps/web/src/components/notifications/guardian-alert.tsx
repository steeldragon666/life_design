'use client';

import { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, ShieldCheck, Zap, X } from 'lucide-react';
import { DIMENSION_LABELS, type Dimension } from '@life-design/core';
import type { GuardianLogEntry } from '@/lib/ml/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GuardianAlertProps {
  entry: GuardianLogEntry;
  actionText: string;
  onDismiss: () => void;
  onAccept: () => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TRIGGER_META: Record<
  GuardianLogEntry['triggerType'],
  { icon: typeof AlertTriangle; label: string; colour: string; bgColour: string }
> = {
  burnout: {
    icon: AlertTriangle,
    label: 'Burnout Risk Detected',
    colour: 'text-warm-400',
    bgColour: 'bg-warm-400/10',
  },
  isolation: {
    icon: ShieldCheck,
    label: 'Isolation Warning',
    colour: 'text-amber-500',
    bgColour: 'bg-amber-500/10',
  },
  flow_state: {
    icon: Zap,
    label: 'Flow State Protected',
    colour: 'text-sage-500',
    bgColour: 'bg-sage-500/10',
  },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Level 3 Guardian intervention modal.
 *
 * High-friction: the user must explicitly accept or dismiss the alert.
 * There is no auto-dismiss or click-outside-to-close behaviour.
 */
export default function GuardianAlert({
  entry,
  actionText,
  onDismiss,
  onAccept,
}: GuardianAlertProps) {
  const [visible, setVisible] = useState(false);

  // Animate in on mount
  useEffect(() => {
    const t = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(t);
  }, []);

  const handleDismiss = useCallback(() => {
    setVisible(false);
    setTimeout(onDismiss, 250);
  }, [onDismiss]);

  const handleAccept = useCallback(() => {
    setVisible(false);
    setTimeout(onAccept, 250);
  }, [onAccept]);

  const meta = TRIGGER_META[entry.triggerType];
  const Icon = meta.icon;

  return (
    // Backdrop overlay -- no click-to-close for high-friction requirement
    <div
      className={`
        fixed inset-0 z-50 flex items-center justify-center p-4
        transition-colors duration-250
        ${visible ? 'bg-stone-900/60 backdrop-blur-sm' : 'bg-transparent'}
      `}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="guardian-alert-title"
      aria-describedby="guardian-alert-body"
    >
      {/* Centred card */}
      <div
        className={`
          relative w-full max-w-md rounded-2xl border border-stone-200
          bg-stone-100 p-6 shadow-xl
          transition-all duration-250
          ${visible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}
        `}
      >
        {/* Close button (top-right, secondary path) */}
        <button
          onClick={handleDismiss}
          aria-label="Dismiss alert"
          className="absolute right-4 top-4 rounded-lg p-1 text-stone-500 hover:bg-stone-200 transition-colors"
        >
          <X className="h-5 w-5" strokeWidth={2.5} />
        </button>

        {/* Icon + heading */}
        <div className="flex items-center gap-3 mb-4">
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${meta.bgColour}`}>
            <Icon className={`h-5 w-5 ${meta.colour}`} fill="currentColor" />
          </div>
          <h2
            id="guardian-alert-title"
            className="text-base font-semibold text-stone-900"
          >
            {meta.label}
          </h2>
        </div>

        {/* Affected dimensions */}
        <div className="mb-4">
          <p className="text-[11px] font-medium uppercase tracking-wider text-stone-500 mb-2">
            Affected areas
          </p>
          <div className="flex flex-wrap gap-2">
            {entry.dimensionsAffected.map((dim) => (
              <span
                key={dim}
                className="inline-flex items-center rounded-full border border-stone-200 bg-white px-3 py-1 text-xs font-medium text-stone-900"
              >
                {DIMENSION_LABELS[dim as Dimension] ?? dim}
              </span>
            ))}
          </div>
        </div>

        {/* Action suggestion */}
        <div
          id="guardian-alert-body"
          className="mb-6 rounded-xl bg-white border border-stone-200 p-4"
        >
          <p className="text-sm leading-relaxed text-stone-900">
            {actionText}
          </p>
        </div>

        {/* Deviation severity indicator */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider text-stone-500">
              Severity
            </span>
            <span className={`text-xs font-semibold ${meta.colour}`}>
              {entry.deviationMagnitude.toFixed(1)}&sigma;
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-stone-200 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                entry.triggerType === 'flow_state' ? 'bg-sage-500' : 'bg-warm-400'
              }`}
              style={{ width: `${Math.min(100, (entry.deviationMagnitude / 3) * 100)}%` }}
            />
          </div>
        </div>

        {/* Actions -- high-friction: explicit buttons only */}
        <div className="flex gap-3">
          <button
            onClick={handleDismiss}
            className="flex-1 rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-medium text-stone-500 hover:bg-stone-200/50 transition-colors"
          >
            Dismiss
          </button>
          <button
            onClick={handleAccept}
            className="flex-1 rounded-xl bg-sage-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sage-600 transition-colors"
          >
            {entry.triggerType === 'flow_state' ? 'Protect my flow' : 'Take action'}
          </button>
        </div>
      </div>
    </div>
  );
}
