'use client';

interface ScaleQuestionProps {
  min: number;
  max: number;
  value: number | null;
  onChange: (value: number) => void;
}

export default function ScaleQuestion({ min, max, value, onChange }: ScaleQuestionProps) {
  const range = Array.from({ length: max - min + 1 }, (_, i) => min + i);

  return (
    <div className="flex flex-wrap justify-center gap-3">
      {range.map((n) => (
        <button
          key={n}
          onClick={() => onChange(n)}
          className={`w-11 h-11 rounded-full text-sm font-medium transition-all duration-200 ${
            value === n
              ? 'bg-[#1A1816] text-white shadow-md scale-110'
              : 'bg-white text-[#1A1816] border border-[#E8E4DD] hover:border-[#1A1816]/30 hover:shadow-sm'
          }`}
          aria-label={`${n} out of ${max}`}
          aria-pressed={value === n}
        >
          {n}
        </button>
      ))}
    </div>
  );
}
