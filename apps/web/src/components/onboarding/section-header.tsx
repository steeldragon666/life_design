'use client';

interface SectionHeaderProps {
  label: string;
  questionCount: number;
  onContinue: () => void;
}

export default function SectionHeader({ label, questionCount, onContinue }: SectionHeaderProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <h1 className="font-serif text-3xl text-stone-900 mb-3">{label}</h1>
      <p className="text-stone-400 text-sm mb-8">
        {questionCount} questions · takes about 1 minute
      </p>
      <button
        onClick={onContinue}
        className="px-8 py-3 bg-stone-900 text-white rounded-xl text-sm font-medium hover:bg-stone-900/90 transition-colors"
      >
        Continue
      </button>
    </div>
  );
}
