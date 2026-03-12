'use client';

const QUICK_MOOD_OPTIONS = [
  { value: 2, emoji: '😞', label: 'Low' },
  { value: 4, emoji: '🙂', label: 'Okay' },
  { value: 6, emoji: '😌', label: 'Steady' },
  { value: 8, emoji: '😊', label: 'Good' },
  { value: 10, emoji: '😁', label: 'Great' },
] as const;

interface MoodSegmentProps {
  value: number;
  onChange: (value: number) => void;
}

export default function MoodSegment({ value, onChange }: MoodSegmentProps) {
  const selectedValue =
    QUICK_MOOD_OPTIONS.find((option) => option.value === value)?.value ?? QUICK_MOOD_OPTIONS[2].value;

  function moveSelection(direction: -1 | 1) {
    const currentIndex = QUICK_MOOD_OPTIONS.findIndex((option) => option.value === selectedValue);
    const nextIndex = Math.min(QUICK_MOOD_OPTIONS.length - 1, Math.max(0, currentIndex + direction));
    onChange(QUICK_MOOD_OPTIONS[nextIndex].value);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-white">Mood</span>
        <span className="text-sm text-slate-300">One tap</span>
      </div>
      <div role="radiogroup" aria-label="Quick mood selection" className="grid grid-cols-5 gap-2">
        {QUICK_MOOD_OPTIONS.map((option) => {
          const selected = option.value === selectedValue;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={`${option.label} mood ${option.value} out of 10`}
              onClick={() => onChange(option.value)}
              onKeyDown={(event) => {
                if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
                  event.preventDefault();
                  moveSelection(1);
                }
                if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
                  event.preventDefault();
                  moveSelection(-1);
                }
              }}
              className={`rounded-md border px-2 py-2 text-center transition ${
                selected
                  ? 'border-indigo-400 bg-indigo-500/30 text-white'
                  : 'border-white/20 bg-white/5 text-slate-200 hover:border-white/40 hover:bg-white/10'
              }`}
            >
              <span className="block text-xl leading-none">{option.emoji}</span>
              <span className="mt-1 block text-xs">{option.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
