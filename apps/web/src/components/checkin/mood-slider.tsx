'use client';

import { useRef } from 'react';

interface MoodSliderProps {
  value: number;
  onChange: (value: number) => void;
}

const MOOD_OPTIONS = [
  { value: 1, emoji: '😞', label: 'Low' },
  { value: 2, emoji: '🙂', label: 'Okay' },
  { value: 3, emoji: '😌', label: 'Steady' },
  { value: 4, emoji: '😊', label: 'Good' },
  { value: 5, emoji: '😁', label: 'Great' },
] as const;

export default function MoodSlider({ value, onChange }: MoodSliderProps) {
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const selectedValue =
    MOOD_OPTIONS.find((option) => option.value === value)?.value ?? MOOD_OPTIONS[2].value;

  function moveSelection(direction: -1 | 1) {
    const currentIndex = MOOD_OPTIONS.findIndex((option) => option.value === selectedValue);
    const nextIndex = Math.min(MOOD_OPTIONS.length - 1, Math.max(0, currentIndex + direction));
    onChange(MOOD_OPTIONS[nextIndex].value);
    buttonRefs.current[nextIndex]?.focus();
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-stone-800">Mood</span>
      </div>
      <div role="radiogroup" aria-label="Mood selection" className="grid grid-cols-5 gap-2">
        {MOOD_OPTIONS.map((option, index) => {
          const selected = option.value === selectedValue;
          return (
            <button
              key={option.value}
              ref={(el) => { buttonRefs.current[index] = el; }}
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
