'use client';

import Link from 'next/link';
import { useElevenLabsTTS } from '@/hooks/useElevenLabsTTS';
import { mentorTypeToArchetype, getArchetypeConfig } from '@/lib/mentor-archetypes';
import type { MentorType } from '@life-design/core';
import MentorAvatar from './mentor-avatar';

interface MentorInfo {
  id: string;
  name: string;
  type: string;
  description: string;
}

interface MentorCardProps {
  mentor: MentorInfo;
  isActive?: boolean;
  userMentorId?: string;
  onActivate: (mentorId: string) => void;
}

export default function MentorCard({
  mentor,
  isActive,
  userMentorId,
  onActivate,
}: MentorCardProps) {
  const archetype = mentorTypeToArchetype(mentor.type as MentorType);
  const config = getArchetypeConfig(archetype);
  const { speak, isSpeaking } = useElevenLabsTTS();

  const handleVoicePreview = async () => {
    await speak(config.greetingText, archetype);
  };

  return (
    <div className="rounded-lg border border-gray-200 p-6 shadow-sm">
      {/* Portrait hero */}
      <div className="mb-4 flex justify-center">
        <MentorAvatar
          archetype={archetype}
          state="idle"
          size="lg"
        />
      </div>

      <h3 className="text-lg font-semibold">{mentor.name}</h3>
      <p className="mt-1 text-sm text-gray-500">{config.label}</p>
      <p className="mt-2 text-gray-600">{mentor.description}</p>

      {/* Voice preview and action buttons */}
      <div className="mt-4 flex flex-col gap-3">
        <button
          onClick={handleVoicePreview}
          disabled={isSpeaking}
          aria-label={`Hear ${config.characterName}'s voice`}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          {isSpeaking ? 'Speaking...' : 'Hear Voice'}
        </button>

        <div className="flex items-center gap-3">
          {isActive ? (
            <>
              <span className="text-sm font-medium text-green-600">Active</span>
              {userMentorId && (
                <Link
                  href={`/mentors/${userMentorId}/chat`}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700"
                >
                  Chat
                </Link>
              )}
            </>
          ) : (
            <button
              onClick={() => onActivate(mentor.id)}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700"
            >
              Activate
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
