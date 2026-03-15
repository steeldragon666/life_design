'use client';

import { useState, useEffect, useRef } from 'react';

interface JournalPreviewProps {
  text: string;
  summarize: (text: string, maxLength?: number) => Promise<string>;
  isReady: boolean;
}

/**
 * Real-time summary preview shown as the user types a journal entry.
 * Debounces 500ms before invoking the local summarization model.
 */
export default function JournalPreview({ text, summarize, isReady }: JournalPreviewProps) {
  const [summary, setSummary] = useState('');
  const [isSummarizing, setIsSummarizing] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef(0);

  useEffect(() => {
    if (!isReady || text.trim().length < 40) {
      setSummary('');
      return;
    }

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(async () => {
      const generation = ++abortRef.current;
      setIsSummarizing(true);
      try {
        const result = await summarize(text, 60);
        // Only apply if this is still the latest generation
        if (generation === abortRef.current) {
          setSummary(result);
        }
      } catch {
        // Silently fail — the preview is optional
      } finally {
        if (generation === abortRef.current) {
          setIsSummarizing(false);
        }
      }
    }, 500);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [text, summarize, isReady]);

  if (!summary && !isSummarizing) return null;

  return (
    <div className="mt-2 rounded-lg bg-white/5 px-3 py-2">
      <div className="mb-1 flex items-center gap-1.5">
        <span className="rounded bg-indigo-500/20 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-indigo-400">
          AI Summary
        </span>
        {isSummarizing && (
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-indigo-400" />
        )}
      </div>
      {summary && (
        <p className="text-sm leading-relaxed text-white/60">{summary}</p>
      )}
    </div>
  );
}
