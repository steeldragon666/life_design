'use client';

interface MultiSelectProps {
  options: { value: string; label: string }[];
  value: string[];
  onChange: (value: string[]) => void;
  maxSelections: number;
}

export default function MultiSelect({ options, value, onChange, maxSelections }: MultiSelectProps) {
  const handleToggle = (optionValue: string) => {
    if (value.includes(optionValue)) {
      onChange(value.filter((v) => v !== optionValue));
    } else if (value.length < maxSelections) {
      onChange([...value, optionValue]);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-stone-400">Select up to {maxSelections}</p>
      {options.map((option) => {
        const isSelected = value.includes(option.value);
        const isDisabled = !isSelected && value.length >= maxSelections;
        return (
          <button
            key={option.value}
            onClick={() => handleToggle(option.value)}
            disabled={isDisabled}
            className={`w-full text-left px-4 py-3 rounded-xl transition-all duration-200 ${
              isSelected
                ? 'bg-stone-900 text-white shadow-md'
                : isDisabled
                  ? 'bg-stone-100 text-stone-400 border border-stone-200 cursor-not-allowed'
                  : 'bg-white text-stone-900 border border-stone-200 hover:border-stone-900/30 hover:shadow-sm'
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
