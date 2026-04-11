'use client';

import { cn } from '../utils/cn';
import { Avatar } from '../components/Avatar';

export interface MentorAvatarProps {
  src?: string;
  name: string;
  status?: 'idle' | 'speaking' | 'thinking';
  className?: string;
}

export function MentorAvatar({ src, name, status = 'idle', className }: MentorAvatarProps) {
  return (
    <div className={cn(
      'relative',
      status === 'speaking' && 'animate-pulse',
      className,
    )}>
      <Avatar
        src={src}
        alt={name}
        size="lg"
        status={status === 'idle' ? undefined : 'online'}
      />
      {status === 'thinking' && (
        <div className="absolute -bottom-1 -right-1 flex gap-0.5">
          <span className="w-1.5 h-1.5 rounded-full bg-sage-400 animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-1.5 h-1.5 rounded-full bg-sage-400 animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-1.5 h-1.5 rounded-full bg-sage-400 animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      )}
    </div>
  );
}
