'use client';

interface SectionHeaderProps {
  label: string;
  questionCount: number;
  onContinue: () => void;
}

export default function SectionHeader({ label, questionCount, onContinue }: SectionHeaderProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <h1 className="font-['Instrument_Serif'] text-3xl text-[#1A1816] mb-3">{label}</h1>
      <p className="text-[#A8A198] text-sm mb-8">
        {questionCount} questions · takes about 1 minute
      </p>
      <button
        onClick={onContinue}
        className="px-8 py-3 bg-[#1A1816] text-white rounded-xl text-sm font-medium hover:bg-[#1A1816]/90 transition-colors"
      >
        Continue
      </button>
    </div>
  );
}
