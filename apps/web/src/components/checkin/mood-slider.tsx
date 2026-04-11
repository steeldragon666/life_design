'use client';

interface MoodSliderProps {
  value: number;
  onChange: (value: number) => void;
}

const MOOD_OPTIONS = [
  { value: 1, emoji: '\u{1F614}', label: 'Very Low' },
  { value: 2, emoji: '\u{1F61E}', label: 'Low' },
  { value: 3, emoji: '\u{1F610}', label: 'Okay' },
  { value: 4, emoji: '\u{1F60A}', label: 'Good' },
  { value: 5, emoji: '\u{1F601}', label: 'Great' },
] as const;

export default function MoodSlider({ value, onChange }: MoodSliderProps) {
  const selectedValue =
    MOOD_OPTIONS.find((option) => option.value === value)?.value ?? MOOD_OPTIONS[2].value;

  function moveSelection(direction: -1 | 1) {
    const currentIndex = MOOD_OPTIONS.findIndex((option) => option.value === selectedValue);
    const nextIndex = Math.min(MOOD_OPTIONS.length - 1, Math.max(0, currentIndex + direction));
    onChange(MOOD_OPTIONS[nextIndex].value);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-stone-800">Mood</span>
      </div>
      <div role="radiogroup" aria-label="Mood selection" className="grid grid-cols-5 gap-2">
        {MOOD_OPTIONS.map((option) => {
          const selected = option.value === selectedValue;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={`${option.label} mood ${option.value} out of 5`}
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
                  ? 'border-sage-500 bg-sage-500/20 text-stone-800'
                  : 'border-stone-200 bg-stone-50 text-stone-600 hover:border-stone-300 hover:bg-stone-100'
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
