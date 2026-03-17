'use client';

import { useState, useCallback } from 'react';
import { useFlowState } from '../flow-state';

interface MentorOption {
  id: string;
  archetype: 'therapist' | 'coach' | 'sage';
  characterName: string;
  label: string;
  description: string;
  greeting: string;
  accentColor: string;
}

const MENTORS: MentorOption[] = [
  {
    id: 'therapist',
    archetype: 'therapist',
    characterName: 'Eleanor',
    label: 'Compassionate Therapist',
    description: 'Gentle, emotionally validating guidance with reflective questions.',
    greeting: "Hello, I'm Eleanor. Take a breath -- there's no rush. I'm here whenever you're ready to talk.",
    accentColor: '#8b5cf6',
  },
  {
    id: 'coach',
    archetype: 'coach',
    characterName: 'Theo',
    label: 'Focused Coach',
    description: 'Warm accountability, practical clarity, and momentum-building prompts.',
    greeting: "Hey! I'm Theo. Let's figure out what matters most to you today and make it happen.",
    accentColor: '#f59e0b',
  },
  {
    id: 'sage',
    archetype: 'sage',
    characterName: 'Maya',
    label: 'Reflective Sage',
    description: 'Contemplative, wise perspective to align identity, meaning, and direction.',
    greeting: "Welcome. I'm Maya. Let's take a wider view of where you are and where you'd like to go.",
    accentColor: '#10b981',
  },
];

export default function MentorStep() {
  const { setMentor, nextStep, selectedMentor } = useFlowState();
  const [selected, setSelected] = useState<string | null>(selectedMentor);
  const [speaking, setSpeaking] = useState<string | null>(null);

  const handleSelect = (mentorId: string) => {
    setSelected(mentorId);
  };

  const handleHearVoice = useCallback((mentor: MentorOption) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(mentor.greeting);
    utterance.rate = 0.9;
    utterance.pitch = mentor.archetype === 'therapist' ? 1.1 : mentor.archetype === 'sage' ? 0.95 : 1.0;

    setSpeaking(mentor.id);
    utterance.onend = () => setSpeaking(null);
    utterance.onerror = () => setSpeaking(null);

    window.speechSynthesis.speak(utterance);
  }, []);

  const handleContinue = () => {
    if (!selected) return;
    setMentor(selected);
    nextStep();
  };

  return (
    <div className="flex flex-col gap-8 max-w-lg mx-auto w-full px-6 pt-8 pb-12">
      <div className="text-center">
        <h2 className="font-['Instrument_Serif'] text-3xl md:text-4xl text-[#1A1816] tracking-tight">
          Choose your mentor
        </h2>
        <p className="mt-3 text-[#7D756A] text-base">
          Each mentor has a different style. You can change anytime.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {MENTORS.map((mentor) => {
          const isSelected = selected === mentor.id;
          const isSpeaking = speaking === mentor.id;

          return (
            <button
              key={mentor.id}
              type="button"
              onClick={() => handleSelect(mentor.id)}
              className={`relative text-left p-5 rounded-2xl border-2 transition-all ${
                isSelected
                  ? 'border-[#5A7F5A] bg-[#5A7F5A]/5 ring-2 ring-[#5A7F5A]/20'
                  : 'border-[#E8E4DD] bg-white hover:border-[#C4BFB6]'
              }`}
            >
              <div className="flex items-start gap-4">
                {/* Avatar */}
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-lg font-['Instrument_Serif'] shrink-0"
                  style={{ backgroundColor: mentor.accentColor }}
                >
                  {mentor.characterName[0]}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-[#1A1816] font-semibold text-base">
                      {mentor.characterName}
                    </h3>
                    <span className="text-xs text-[#A8A198] font-medium">
                      {mentor.label}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-[#7D756A] leading-relaxed">
                    {mentor.description}
                  </p>

                  {/* Hear Voice button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleHearVoice(mentor);
                    }}
                    className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-[#5A7F5A] hover:text-[#4E6F4E] transition-colors"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                    </svg>
                    {isSpeaking ? 'Speaking...' : 'Hear Voice'}
                  </button>
                </div>

                {/* Selection indicator */}
                {isSelected && (
                  <div className="w-6 h-6 rounded-full bg-[#5A7F5A] flex items-center justify-center shrink-0">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <button
        onClick={handleContinue}
        disabled={!selected}
        className="w-full px-8 py-3.5 rounded-xl text-white font-medium text-base
          bg-gradient-to-r from-[#5A7F5A] to-[#6B946B]
          hover:from-[#4E6F4E] hover:to-[#5A7F5A]
          active:scale-[0.98] transition-all shadow-sm
          disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
      >
        Continue
      </button>
    </div>
  );
}
