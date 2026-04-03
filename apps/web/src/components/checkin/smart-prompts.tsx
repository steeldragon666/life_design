'use client';

import { DIMENSION_LABELS, type Dimension } from '@life-design/core';
import type { SmartPromptSuggestion } from '@/lib/smart-prompts';

interface SmartPromptsProps {
  suggestions: SmartPromptSuggestion[];
  onSelectPrompt: (prompt: string) => void;
}

/**
 * Displays AI-driven journal prompt suggestions based on weakest dimensions.
 * Clicking a prompt populates the journal entry textarea.
 */
export default function SmartPrompts({ suggestions, onSelectPrompt }: SmartPromptsProps) {
  if (!suggestions.length) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase tracking-wider text-white/40">
        Suggested prompts
      </p>
      {suggestions.map((suggestion) => {
        const dimLabel =
          DIMENSION_LABELS[suggestion.dimension as Dimension] ?? suggestion.dimension;
        return (
          <button
            key={suggestion.dimension}
            type="button"
            className="group w-full rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2.5 text-left transition-colors hover:border-sage-500/30 hover:bg-sage-500/5"
            onClick={() => onSelectPrompt(suggestion.prompt)}
          >
            <div className="mb-1 flex items-center gap-1.5">
              <span className="rounded bg-sage-500/20 px-1.5 py-0.5 text-[11px] font-medium uppercase tracking-wider text-sage-500">
                {dimLabel}
              </span>
              <span className="text-[11px] text-white/30">
                {suggestion.reason}
              </span>
            </div>
            <p className="text-sm leading-relaxed text-white/70 group-hover:text-white/90">
              {suggestion.prompt}
            </p>
          </button>
        );
      })}
    </div>
  );
}
