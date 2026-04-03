'use client';

import Link from 'next/link';
import { useElevenLabsTTS } from '@/hooks/useElevenLabsTTS';
import { mentorTypeToArchetype, getArchetypeConfig } from '@/lib/mentor-archetypes';
import type { MentorType } from '@life-design/core';
import MentorAvatar from './mentor-avatar';
import { Card } from '@life-design/ui';
import { Button } from '@life-design/ui';

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
    <Card variant="default" hoverable className="flex flex-col">
      {/* Portrait hero */}
      <div className="mb-4 flex justify-center">
        <MentorAvatar
          archetype={archetype}
          state="idle"
          size="lg"
        />
      </div>

      <h3 className="text-lg font-semibold text-stone-800">{mentor.name}</h3>
      <p className="mt-1 text-sm text-stone-500">{config.label}</p>
      <p className="mt-2 text-stone-600">{mentor.description}</p>

      {/* Voice preview and action buttons */}
      <div className="mt-4 flex flex-col gap-3">
        <Button
          variant="secondary"
          size="sm"
          onClick={handleVoicePreview}
          disabled={isSpeaking}
          aria-label={`Hear ${config.characterName}'s voice`}
        >
          {isSpeaking ? 'Speaking...' : 'Hear Voice'}
        </Button>

        <div className="flex items-center gap-3">
          {isActive ? (
            <>
              <span className="text-sm font-medium text-sage-500">Active</span>
              {userMentorId && (
                <Link
                  href={`/mentors/${userMentorId}/chat`}
                  className="inline-flex items-center justify-center rounded-[8px] bg-sage-600 px-5 py-2.5 text-[13px] font-semibold text-white shadow-[0_2px_8px_rgba(90,127,90,0.3)] transition-all hover:bg-sage-600/90"
                >
                  Chat
                </Link>
              )}
            </>
          ) : (
            <Button
              variant="primary"
              size="default"
              onClick={() => onActivate(mentor.id)}
            >
              Activate
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
