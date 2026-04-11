'use client';

import { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';
import { cn } from '../utils/cn';
import { MentorAvatar } from './MentorAvatar';
import { ChatBubble } from './ChatBubble';

export interface MentorMessage {
  id: string;
  message: string;
  sender: 'user' | 'mentor';
  timestamp?: string;
}

export interface MentorPanelProps {
  mentorName: string;
  mentorAvatar?: string;
  messages: MentorMessage[];
  onSend: (message: string) => void;
  isLoading?: boolean;
  className?: string;
}

export function MentorPanel({ mentorName, mentorAvatar, messages, onSend, isLoading, className }: MentorPanelProps) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    onSend(input.trim());
    setInput('');
  };

  return (
    <div className={cn('flex flex-col h-full bg-surface-page', className)}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-stone-200 bg-surface-default">
        <MentorAvatar src={mentorAvatar} name={mentorName} status={isLoading ? 'thinking' : 'idle'} />
        <div>
          <p className="text-sm font-semibold text-stone-800">{mentorName}</p>
          <p className="text-xs text-stone-500">{isLoading ? 'Thinking...' : 'Online'}</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3" role="log" aria-live="polite" aria-label="Chat messages">
        {messages.map((msg) => (
          <ChatBubble key={msg.id} message={msg.message} sender={msg.sender} timestamp={msg.timestamp} />
        ))}
        {isLoading && <ChatBubble message="" sender="mentor" isTyping />}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2 px-4 py-3 border-t border-stone-200 bg-surface-default">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 px-4 py-2 rounded-full border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-sage-300 bg-surface-page"
          aria-label="Message input"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className="p-2 rounded-full bg-sage-500 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-sage-600 transition-colors cursor-pointer"
          aria-label="Send message"
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
}
