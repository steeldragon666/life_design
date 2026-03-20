'use client';

import { Brain, Compass, Sparkles } from 'lucide-react';
import { ARCHETYPE_CONFIGS, type MentorArchetype } from '@/lib/mentor-archetypes';
import { cn } from '@/lib/utils';

interface ArchetypeSelectorProps {
  selected: MentorArchetype;
  onSelect: (archetype: MentorArchetype) => void;
}

const icons = {
  therapist: Brain,
  coach: Compass,
  sage: Sparkles,
};

export default function ArchetypeSelector({ selected, onSelect }: ArchetypeSelectorProps) {
  return (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-xl font-semibold text-stone-800 mb-2">Choose Your Mentor Archetype</h3>
        <p className="text-sm text-stone-500">You can switch this anytime in Settings.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {ARCHETYPE_CONFIGS.map((cfg) => {
          const Icon = icons[cfg.id];
          const isActive = cfg.id === selected;
          return (
            <button
              key={cfg.id}
              onClick={() => onSelect(cfg.id)}
              className={cn(
                'text-left rounded-2xl border p-5 transition-all',
                isActive
                  ? 'bg-sage-50 border-sage-400'
                  : 'bg-white border-stone-200 hover:border-stone-300'
              )}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-xl bg-sage-50 flex items-center justify-center">
                  <Icon className="h-5 w-5 text-sage-600" />
                </div>
                <div>
                  <p className="text-stone-800 font-semibold">{cfg.label}</p>
                  <p className="text-xs text-stone-500">Character: {cfg.characterName}</p>
                </div>
              </div>
              <p className="text-sm text-stone-600 mb-3">{cfg.summary}</p>
              <p className="text-xs text-stone-500">Meditation style: {cfg.meditationStyle}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
