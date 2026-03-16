'use client';

interface SmartPrompt {
  text: string;
  dimension: string;
  priority: number;
  type: string;
}

interface SmartJournalPromptProps {
  prompt: SmartPrompt;
  onSelectPrompt: (text: string) => void;
  onRequestNew: () => void;
}

export default function SmartJournalPrompt({
  prompt,
  onSelectPrompt,
  onRequestNew,
}: SmartJournalPromptProps) {
  return (
    <div className="rounded-xl border border-stone-200 bg-stone-50 p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-medium uppercase tracking-wider text-stone-400">
          Suggested prompt
        </span>
        {prompt.dimension && (
          <span className="text-xs text-sage-500 bg-sage-50 px-2 py-0.5 rounded-full">
            {prompt.dimension}
          </span>
        )}
      </div>
      <p className="text-stone-700 mb-4 leading-relaxed">{prompt.text}</p>
      <div className="flex gap-2">
        <button
          onClick={() => onSelectPrompt(prompt.text)}
          className="text-sm font-medium text-sage-600 hover:text-sage-700 px-3 py-1.5 rounded-lg bg-sage-50 hover:bg-sage-100 transition-colors"
        >
          Use this prompt
        </button>
        <button
          onClick={onRequestNew}
          className="text-sm text-stone-500 hover:text-stone-600 px-3 py-1.5 rounded-lg hover:bg-stone-100 transition-colors"
        >
          Try another
        </button>
      </div>
    </div>
  );
}
