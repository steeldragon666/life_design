import type { RefObject } from 'react';
import { cn } from '@/lib/utils';
import { VoiceWave } from './voice-wave';
import type { ConversationMessage } from '../hooks/use-onboarding-conversation';

interface ConversationMessagesProps {
  messages: ConversationMessage[];
  isSpeaking: boolean;
  messagesEndRef: RefObject<HTMLDivElement | null>;
}

export function ConversationMessages({
  messages,
  isSpeaking,
  messagesEndRef,
}: ConversationMessagesProps) {
  return (
    <div className="h-[400px] overflow-y-auto space-y-4 mb-6 scrollbar-thin">
      {messages.length === 0 ? (
        <div className="h-full flex items-center justify-center text-stone-400">
          <div className="text-center">
            <VoiceWave isActive={isSpeaking} />
            <p className="mt-2">Your conversation will begin here...</p>
          </div>
        </div>
      ) : (
        messages.map((message, index) => (
          <div
            key={index}
            className={cn('flex', message.role === 'user' ? 'justify-end' : 'justify-start')}
          >
            <div
              className={cn(
                'max-w-[85%] rounded-2xl px-5 py-4',
                message.role === 'user'
                  ? 'bg-gradient-to-br from-sage-500 to-sage-600 text-white'
                  : 'bg-stone-50 text-stone-700 border border-stone-200'
              )}
            >
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
              {message.role === 'assistant' &&
                isSpeaking &&
                index === messages.length - 1 && (
                  <div className="mt-2">
                    <VoiceWave isActive />
                  </div>
                )}
            </div>
          </div>
        ))
      )}
      <div ref={messagesEndRef} />
    </div>
  );
}
