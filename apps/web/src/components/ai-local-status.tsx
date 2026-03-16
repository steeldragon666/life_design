'use client';

import { type AILocalProgress } from '@life-design/ai-local';

interface AILocalStatusProps {
  isReady: boolean;
  isLoading: boolean;
  progress: AILocalProgress | null;
  error: Error | null;
}

export default function AILocalStatus({ isReady, isLoading, progress, error }: AILocalStatusProps) {
  if (error) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
        <span className="h-2 w-2 rounded-full bg-red-500" />
        AI unavailable
      </div>
    );
  }

  if (isReady && !isLoading) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400">
        <span className="h-2 w-2 rounded-full bg-emerald-500" />
        AI Ready
      </div>
    );
  }

  if (isLoading && progress) {
    const pct = progress.progress != null ? Math.round(progress.progress) : null;
    return (
      <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-amber-400">
        <span className="h-2 w-2 animate-pulse rounded-full bg-amber-500" />
        <span className="truncate">
          {progress.status === 'progress' && pct != null
            ? `Loading ${progress.task} model… ${pct}%`
            : `Initializing ${progress.task}…`}
        </span>
        {pct != null && (
          <div className="ml-auto h-1 w-16 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-amber-500 transition-all duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
        )}
      </div>
    );
  }

  return null;
}
