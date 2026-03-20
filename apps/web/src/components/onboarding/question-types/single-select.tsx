'use client';

interface SingleSelectProps {
  options: { value: string; label: string }[];
  value: string | null;
  onChange: (value: string) => void;
}

export default function SingleSelect({ options, value, onChange }: SingleSelectProps) {
  return (
    <div className="space-y-3">
      {options.map((option) => {
        const isSelected = value === option.value;
        return (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            className={`w-full text-left px-4 py-3 rounded-xl transition-all duration-200 ${
              isSelected
                ? 'bg-[#1A1816] text-white shadow-md'
                : 'bg-white text-[#1A1816] border border-[#E8E4DD] hover:border-[#1A1816]/30 hover:shadow-sm'
            }`}
            aria-pressed={isSelected}
          >
            <span className="text-sm font-medium">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
