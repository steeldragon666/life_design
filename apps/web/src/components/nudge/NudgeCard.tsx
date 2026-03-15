'use client';

import { useState, useEffect, useCallback } from 'react';

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
  }, [autoDismissMs]);

  const handleDismiss = useCallback(() => {
    setExiting(true);
    setTimeout(() => onDismiss(nudge.id), 300);
  }, [nudge.id, onDismiss]);

  const timeIcon = nudge.type === 'morning' ? '\u2600' : nudge.type === 'evening' ? '\u{1F319}' : '\u26A1';

  return (
    <div
      className={`
        fixed bottom-6 right-6 z-50 max-w-sm w-full
        transition-all duration-300 ease-out
        ${visible && !exiting ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}
      `}
    >
      <div className="rounded-2xl border border-white/20 bg-white/80 backdrop-blur-xl shadow-lg shadow-black/5 p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">{timeIcon}</span>
            <span className="text-[10px] font-medium uppercase tracking-wider text-[#A8A198]">
              {nudge.type} nudge
            </span>
            {nudge.dimension && (
              <>
                <span className="h-0.5 w-0.5 rounded-full bg-[#D4CFC5]" />
                <span className="text-[10px] font-medium uppercase tracking-wider text-[#5A7F5A]">
                  {nudge.dimension}
                </span>
              </>
            )}
          </div>

          {/* Close */}
          <button
            onClick={handleDismiss}
            aria-label="Dismiss nudge"
            className="p-1 rounded-lg text-[#C4C0B8] hover:text-[#7D756A] hover:bg-[#F5F3EF] transition-colors"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div>
          <h3 className="text-sm font-medium text-[#2A2623]">{nudge.title}</h3>
          <p className="mt-1 text-sm text-[#7D756A] leading-relaxed">{nudge.message}</p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleDismiss}
            className="flex-1 px-3 py-2 rounded-xl text-xs font-medium bg-[#F5F3EF] text-[#7D756A] hover:bg-[#EBE8E2] transition-colors"
          >
            Got it
          </button>
          {onTalkToMentor && (
            <button
              onClick={onTalkToMentor}
              className="flex-1 px-3 py-2 rounded-xl text-xs font-medium bg-[#5A7F5A] text-white hover:bg-[#4A6F4A] transition-colors"
            >
              Talk to mentor
            </button>
          )}
        </div>

        {/* Auto-dismiss progress bar */}
        {autoDismissMs > 0 && (
          <div className="h-0.5 bg-[#E8E4DD] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#5A7F5A]/40 rounded-full"
              style={{
                animation: `shrink ${autoDismissMs}ms linear forwards`,
              }}
            />
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
}
