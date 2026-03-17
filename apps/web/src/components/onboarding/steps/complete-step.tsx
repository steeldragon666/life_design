'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useFlowState } from '../flow-state';
import { useGuest } from '@/lib/guest-context';

const ARCHETYPE_MAP: Record<string, 'therapist' | 'coach' | 'sage'> = {
  therapist: 'therapist',
  coach: 'coach',
  sage: 'sage',
};

const MENTOR_NAMES: Record<string, string> = {
  therapist: 'Eleanor',
  coach: 'Theo',
  sage: 'Maya',
};

const MENTOR_LABELS: Record<string, string> = {
  therapist: 'Compassionate Therapist',
  coach: 'Focused Coach',
  sage: 'Reflective Sage',
};

export default function CompleteStep() {
  const router = useRouter();
  const { userName, profession, interests, postcode, selectedMentor } = useFlowState();
  const { setProfile, setMentorProfile } = useGuest();
  const savedRef = useRef(false);

  // Save profile on mount (with StrictMode guard)
  useEffect(() => {
    if (savedRef.current) return;
    savedRef.current = true;

    // Save guest profile
    setProfile({
      id: 'guest-user',
      name: userName ?? undefined,
      profession: profession ?? undefined,
      interests: interests.length > 0 ? interests : undefined,
      postcode: postcode ?? undefined,
      onboarded: true,
    } as any);

    // Save mentor profile
    if (selectedMentor) {
      const archetype = ARCHETYPE_MAP[selectedMentor] ?? 'therapist';
      const characterName = MENTOR_NAMES[selectedMentor] ?? 'Eleanor';
      setMentorProfile({ archetype, characterName });
    }
  }, [userName, profession, interests, postcode, selectedMentor, setProfile, setMentorProfile]);

  const mentorName = selectedMentor ? MENTOR_NAMES[selectedMentor] : null;
  const mentorLabel = selectedMentor ? MENTOR_LABELS[selectedMentor] : null;

  return (
    <div className="flex flex-col items-center gap-8 max-w-md mx-auto w-full px-6 pt-12">
      {/* Celebration icon */}
      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#C4D5C4] to-[#5A7F5A] flex items-center justify-center">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>

      <div className="text-center">
        <h2 className="font-['Instrument_Serif'] text-3xl md:text-4xl text-[#1A1816] tracking-tight">
          Welcome, {userName || 'friend'}!
        </h2>
        <p className="mt-3 text-[#7D756A] text-base leading-relaxed">
          Your journey with Life Design begins now.
          {mentorName && mentorLabel && (
            <>
              {' '}
              <span className="font-medium text-[#1A1816]">{mentorName}</span>, your{' '}
              <span className="text-[#5A7F5A]">{mentorLabel}</span>, is ready to guide you.
            </>
          )}
        </p>
      </div>

      <button
        onClick={() => router.push('/dashboard')}
        className="mt-4 w-full px-8 py-3.5 rounded-xl text-white font-medium text-base
          bg-gradient-to-r from-[#5A7F5A] to-[#6B946B]
          hover:from-[#4E6F4E] hover:to-[#5A7F5A]
          active:scale-[0.98] transition-all shadow-sm"
      >
        Go to Dashboard
      </button>
    </div>
  );
}
