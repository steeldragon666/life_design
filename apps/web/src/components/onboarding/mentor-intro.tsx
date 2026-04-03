'use client';

interface MentorIntroProps {
  onContinue: () => void;
}

const MENTORS = [
  {
    name: 'Eleanor',
    archetype: 'The Strategist',
    description: 'Structured plans, accountability, and long-term thinking.',
    greeting: "Let's build a plan that actually works for your life.",
    color: '#8B5CF6',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
  },
  {
    name: 'Theo',
    archetype: 'The Motivator',
    description: 'Energy, momentum, and celebrating every win.',
    greeting: "You've already started — that's half the battle.",
    color: '#F59E0B',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
  },
  {
    name: 'Maya',
    archetype: 'The Empath',
    description: 'Mindfulness, balance, and sustainable growth.',
    greeting: "It's not about being perfect — it's about being present.",
    color: '#10B981',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
  },
];

export default function MentorIntro({ onContinue }: MentorIntroProps) {
  return (
    <div className="min-h-screen px-4 py-8 md:px-8">
      <div className="max-w-lg mx-auto">
        <h1 className="font-serif text-3xl text-stone-900 text-center mb-2">
          Meet Your Mentors
        </h1>
        <p className="text-stone-400 text-sm text-center mb-8">
          Three AI mentors, each with a different approach
        </p>

        <div className="space-y-4 mb-8">
          {MENTORS.map((mentor) => (
            <div
              key={mentor.name}
              className={`${mentor.bgColor} ${mentor.borderColor} border rounded-2xl p-5`}
            >
              <div className="flex items-center gap-3 mb-2">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold"
                  style={{ backgroundColor: mentor.color }}
                >
                  {mentor.name[0]}
                </div>
                <div>
                  <h3 className="font-semibold text-stone-900">{mentor.name}</h3>
                  <p className="text-xs text-stone-400">{mentor.archetype}</p>
                </div>
              </div>
              <p className="text-sm text-stone-900/80 mb-2">{mentor.description}</p>
              <p className="text-sm italic text-stone-900/60">"{mentor.greeting}"</p>
            </div>
          ))}
        </div>

        <button
          onClick={onContinue}
          className="w-full py-3 bg-stone-900 text-white rounded-xl text-sm font-medium hover:bg-stone-900/90 transition-colors"
        >
          Continue to Summary
        </button>
      </div>
    </div>
  );
}
