'use client';

import { cn } from '../utils/cn';

export interface ChatBubbleProps {
  message: string;
  sender: 'user' | 'mentor';
  timestamp?: string;
  isTyping?: boolean;
  className?: string;
}

export function ChatBubble({ message, sender, timestamp, isTyping, className }: ChatBubbleProps) {
  const isUser = sender === 'user';

  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start', className)}>
      <div className={cn(
        'max-w-[80%] rounded-2xl px-4 py-3',
        isUser
          ? 'bg-sage-500 text-white rounded-br-sm'
          : 'bg-stone-100 text-stone-800 rounded-bl-sm',
      )}>
        {isTyping ? (
          <div className="flex gap-1 py-1" aria-label="Typing indicator">
            <span className="w-2 h-2 rounded-full bg-stone-400 animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-2 h-2 rounded-full bg-stone-400 animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-2 h-2 rounded-full bg-stone-400 animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        ) : (
          <>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{message}</p>
            {timestamp && (
              <p className={cn('text-xs mt-1', isUser ? 'text-white/70' : 'text-stone-400')}>{timestamp}</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
