'use client';

import { Clock, CheckCircle, Save } from 'lucide-react';

interface ExpectationsCardProps {
  onNext: () => void;
}

export default function ExpectationsCard({ onNext }: ExpectationsCardProps) {
  const sections = [
    { icon: '\u{1F3AF}', label: 'Goal' },
    { icon: '\u{1F49A}', label: 'Wellbeing' },
    { icon: '\u{1F4CA}', label: 'Baseline' },
    { icon: '\u{1F9E0}', label: 'Personality' },
    { icon: '\u{1F525}', label: 'Drive' },
    { icon: '\u2B50', label: 'Satisfaction' },
    { icon: '\u{1F331}', label: 'Needs' },
    { icon: '\u{1F3A8}', label: 'Style' },
  ];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12 bg-gradient-to-b from-stone-50 to-stone-100">
      <div className="max-w-lg w-full space-y-8 text-center">
        <div>
          <h2 className="font-serif text-3xl text-stone-900">Before we begin</h2>
          <p className="text-stone-500 mt-3 text-base">We'll ask you a series of questions across 8 life dimensions to build your personal profile. This helps our AI understand you better.</p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-stone-100">
          <div className="flex flex-wrap justify-center gap-3">
            {sections.map((s) => (
              <span key={s.label} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-50 rounded-full text-sm text-stone-700">
                <span>{s.icon}</span>
                {s.label}
              </span>
            ))}
          </div>
          <p className="text-xs text-stone-400 mt-4">~78 questions across validated instruments</p>
        </div>

        <div className="space-y-4 text-left">
          <div className="flex gap-3 items-start">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
              <Clock size={16} className="text-blue-600" />
            </div>
            <div>
              <h3 className="font-medium text-sm text-stone-900">Takes about 10-15 minutes</h3>
              <p className="text-xs text-stone-500 mt-0.5">Go at your own pace -- no time pressure.</p>
            </div>
          </div>
          <div className="flex gap-3 items-start">
            <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
              <CheckCircle size={16} className="text-green-600" />
            </div>
            <div>
              <h3 className="font-medium text-sm text-stone-900">No right or wrong answers</h3>
              <p className="text-xs text-stone-500 mt-0.5">Just be honest -- your profile works best when it reflects the real you.</p>
            </div>
          </div>
          <div className="flex gap-3 items-start">
            <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center flex-shrink-0">
              <Save size={16} className="text-violet-600" />
            </div>
            <div>
              <h3 className="font-medium text-sm text-stone-900">You can save and come back</h3>
              <p className="text-xs text-stone-500 mt-0.5">Your progress is saved automatically.</p>
            </div>
          </div>
        </div>

        <button
          onClick={onNext}
          className="w-full py-4 rounded-2xl bg-stone-900 text-white font-medium text-lg hover:bg-stone-800 transition-colors"
        >
          Begin profiling
        </button>

        <button
          onClick={onNext}
          className="text-sm text-stone-400 hover:text-stone-600 transition-colors"
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}
