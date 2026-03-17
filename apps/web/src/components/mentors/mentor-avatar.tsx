'use client';

import { useState } from 'react';
import Image from 'next/image';
import { getArchetypeConfig, type MentorArchetype } from '@/lib/mentor-archetypes';
import type { MentorAvatarState } from '@/lib/mentor-types';

interface MentorAvatarProps {
  archetype: MentorArchetype;
  state: MentorAvatarState;
  size: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_MAP = {
  sm: { px: 32, cls: 'h-8 w-8' },
  md: { px: 48, cls: 'h-12 w-12' },
  lg: { px: 96, cls: 'h-24 w-24' },
} as const;

export default function MentorAvatar({ archetype, state, size, className = '' }: MentorAvatarProps) {
  const [imgError, setImgError] = useState(false);
  const config = getArchetypeConfig(archetype);
  const { px, cls } = SIZE_MAP[size];
  const imgSize = px <= 48 ? 48 : 96;

  const stateClass =
    state === 'speaking' ? 'speaking animate-mentor-speaking' :
    state === 'thinking' ? 'thinking animate-mentor-breathing' :
    '';

  if (imgError) {
    return (
      <div
        data-testid="avatar-fallback"
        className={`${cls} rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 ${stateClass} ${className}`}
        style={{ background: `linear-gradient(135deg, ${config.accentColor}, ${config.accentColorMuted})` }}
        aria-label={`${config.characterName} avatar`}
      >
        {config.characterName[0]}
      </div>
    );
  }

  return (
    <div
      className={`${cls} rounded-full overflow-hidden flex-shrink-0 ring-2 ${stateClass} ${className}`}
      style={{
        '--accent': config.accentColor,
        '--accent-muted': config.accentColorMuted,
        '--tw-ring-color': state === 'idle' ? config.accentColorMuted : config.accentColor,
      } as React.CSSProperties}
      aria-label={`${config.characterName} avatar — ${state}`}
    >
      <Image
        src={`${config.portraitBasePath}/portrait-${imgSize}.webp`}
        alt={config.characterName}
        width={px}
        height={px}
        className="object-cover"
        priority={size === 'md'}
        onError={() => setImgError(true)}
      />
    </div>
  );
}
