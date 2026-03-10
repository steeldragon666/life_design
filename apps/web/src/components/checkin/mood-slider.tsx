'use client';

interface MoodSliderProps {
  value: number;
  onChange: (value: number) => void;
}

function getMoodEmoji(value: number): string {
  if (value <= 3) return '😔';
  if (value <= 6) return '😐';
  return '😊';
}

export default function MoodSlider({ value, onChange }: MoodSliderProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Mood</span>
        <span className="text-lg">
          {getMoodEmoji(value)} {value}
        </span>
      </div>
      <input
        type="range"
        role="slider"
        min="1"
        max="10"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
      />
    </div>
  );
}
