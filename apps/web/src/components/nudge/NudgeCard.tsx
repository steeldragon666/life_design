'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, Button } from '@life-design/ui';
import { X } from '@phosphor-icons/react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface NudgeInfo {
  id: number;
  title: string;
  message: string;
  type: string;
  dimension?: string | null;
}

interface NudgeCardProps {
  nudge: NudgeInfo;
  onDismiss: (id: number) => void;
  onTalkToMentor?: () => void;
  autoDismissMs?: number;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function NudgeCard({
  nudge,
  onDismiss,
  onTalkToMentor,
  autoDismissMs = 30_000,
}: NudgeCardProps) {
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);

  // Slide in on mount
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(t);
  }, []);

  // Auto-dismiss timer
  useEffect(() => {
    if (autoDismissMs <= 0) return;
    const t = setTimeout(() => handleDismiss(), autoDismissMs);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoDismissMs]);

  const handleDismiss = useCallback(() => {
    setExiting(true);
    setTimeout(() => onDismiss(nudge.id), 300);
  }, [nudge.id, onDismiss]);

  const timeIcon =
    nudge.type === 'morning' ? '\u2600' : nudge.type === 'evening' ? '\u{1F319}' : '\u26A1';

  return (
    <div
      className={`
        fixed bottom-6 right-6 z-45 max-w-sm w-full
        transition-all duration-300 ease-out
        ${visible && !exiting ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}
      `}
      role="alert"
      aria-live="polite"
    >
      <Card variant="raised" className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg" aria-hidden="true">{timeIcon}</span>
            <span className="text-[11px] font-medium uppercase tracking-wider text-stone-500">
              {nudge.type} nudge
            </span>
            {nudge.dimension && (
              <>
                <span className="h-0.5 w-0.5 rounded-full bg-stone-300" aria-hidden="true" />
                <span className="text-[11px] font-medium uppercase tracking-wider text-sage-500">
                  {nudge.dimension}
                </span>
              </>
            )}
          </div>

          {/* Close */}
          <button
            onClick={handleDismiss}
            aria-label="Dismiss nudge"
            className="p-1 rounded-lg text-stone-300 hover:text-stone-500 hover:bg-stone-100 transition-colors"
          >
            <X className="h-4 w-4" weight="regular" />
          </button>
        </div>

        {/* Content */}
        <div>
          <h3 className="text-sm font-medium text-stone-800">{nudge.title}</h3>
          <p className="mt-1 text-sm text-stone-500 leading-relaxed">{nudge.message}</p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleDismiss}
            className="flex-1"
          >
            Got it
          </Button>
          {onTalkToMentor && (
            <Button
              variant="primary"
              size="sm"
              onClick={onTalkToMentor}
              className="flex-1"
            >
              Talk to mentor
            </Button>
          )}
        </div>

        {/* Auto-dismiss progress bar */}
        {autoDismissMs > 0 && (
          <div className="h-0.5 bg-stone-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-sage-500/40 rounded-full"
              style={{
                animation: `shrink ${autoDismissMs}ms linear forwards`,
              }}
            />
          </div>
        )}
      </Card>

      <style jsx>{`
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
}
