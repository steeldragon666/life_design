'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Mic, Loader2 } from 'lucide-react';
import VoiceRecorder from './voice-recorder';
import type { VoiceRecorderResult } from './voice-recorder';

export const QUICK_ACTIONS = [
  'How am I doing?',
  'What patterns do you see?',
  'What should I focus on?',
  'Predict my week',
] as const;

export type QuickAction = (typeof QUICK_ACTIONS)[number];

interface ChatInputProps {
  onSend: (message: string) => void;
  onVoiceResult?: (result: VoiceRecorderResult) => void;
  disabled?: boolean;
  loading?: boolean;
  placeholder?: string;
}

export default function ChatInput({
  onSend,
  onVoiceResult,
  disabled = false,
  loading = false,
  placeholder = 'Message your mentor...',
}: ChatInputProps) {
  const [value, setValue] = useState('');
  const [showVoice, setShowVoice] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  /* Auto-resize textarea */
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const newHeight = Math.min(el.scrollHeight, 200);
    el.style.height = `${newHeight}px`;
  }, [value]);

  const handleSubmit = useCallback(
    (e?: React.FormEvent) => {
      e?.preventDefault();
      const trimmed = value.trim();
      if (!trimmed || disabled || loading) return;
      onSend(trimmed);
      setValue('');
      /* Reset textarea height */
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    },
    [value, disabled, loading, onSend],
  );

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  function handleQuickAction(action: string) {
    if (disabled || loading) return;
    onSend(action);
  }

  function handleVoiceResult(result: VoiceRecorderResult) {
    setShowVoice(false);
    onVoiceResult?.(result);
    /* Also send transcription as text message if no onVoiceResult handler */
    if (!onVoiceResult && result.transcription) {
      onSend(result.transcription);
    }
  }

  function handleVoiceCancel() {
    setShowVoice(false);
  }

  const canSend = value.trim().length > 0 && !disabled && !loading;
  const isInteractive = !disabled && !loading;

  return (
    <div className="flex flex-col gap-2.5">
      {/* Quick action chips */}
      <div className="flex flex-wrap gap-2" role="list" aria-label="Quick actions">
        {QUICK_ACTIONS.map((action) => (
          <button
            key={action}
            role="listitem"
            onClick={() => handleQuickAction(action)}
            disabled={!isInteractive}
            className="text-xs px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 hover:border-white/20 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 active:scale-95"
            style={{ fontFamily: '"Erode", Georgia, serif' }}
          >
            {action}
          </button>
        ))}
      </div>

      {/* Voice recorder (shown when mic button is active) */}
      {showVoice && (
        <VoiceRecorder
          onResult={handleVoiceResult}
          onCancel={handleVoiceCancel}
          maxDurationSeconds={120}
        />
      )}

      {/* Input row */}
      {!showVoice && (
        <form
          onSubmit={handleSubmit}
          className="relative flex items-end gap-2 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm p-2 transition-all duration-200 focus-within:border-white/20 focus-within:bg-white/[0.07]"
          role="search"
          aria-label="Chat input"
        >
          {/* Auto-resizing textarea */}
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={!isInteractive}
            rows={1}
            aria-label="Message input"
            aria-multiline="true"
            className="flex-1 resize-none bg-transparent text-sm text-white placeholder:text-white/30 focus:outline-none disabled:opacity-40 px-2 py-1.5 leading-relaxed min-h-[2.25rem] max-h-[12.5rem] overflow-y-auto"
            style={{ fontFamily: '"Erode", Georgia, serif' }}
          />

          {/* Microphone button */}
          <button
            type="button"
            onClick={() => setShowVoice(true)}
            disabled={!isInteractive}
            className="flex-shrink-0 h-9 w-9 rounded-xl flex items-center justify-center text-white/40 hover:text-white/80 hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 active:scale-95"
            aria-label="Record voice message"
            title="Record voice message"
          >
            <Mic className="h-4 w-4" />
          </button>

          {/* Send button */}
          <button
            type="submit"
            disabled={!canSend}
            className="flex-shrink-0 h-9 w-9 rounded-xl flex items-center justify-center transition-all duration-200 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
            style={{
              background: canSend
                ? 'linear-gradient(135deg, #4f46e5, #6d28d9)'
                : 'rgba(255,255,255,0.05)',
            }}
            aria-label={loading ? 'Sending…' : 'Send message'}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 text-white animate-spin" />
            ) : (
              <Send className="h-4 w-4 text-white" />
            )}
          </button>
        </form>
      )}

      {/* Helper text */}
      <p className="text-[10px] text-white/20 text-center select-none">
        Press Enter to send, Shift+Enter for new line
      </p>
    </div>
  );
}
