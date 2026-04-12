'use client';

import { useState, useRef, useEffect, useCallback, type KeyboardEvent } from 'react';
import { Heart, X, Send } from 'lucide-react';
import { sendCompanionMessage } from '@/app/(protected)/companion/actions';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

/* ------------------------------------------------------------------ */
/* FloatingAria                                                        */
/* ------------------------------------------------------------------ */

export default function FloatingAria() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasPulsed, setHasPulsed] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  // Stop the pulse animation after first render cycle
  useEffect(() => {
    const timer = setTimeout(() => setHasPulsed(true), 2400);
    return () => clearTimeout(timer);
  }, []);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Focus textarea when sheet opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => textareaRef.current?.focus(), 350);
    }
  }, [isOpen]);

  // Build conversation history for the API
  const buildHistory = useCallback(
    (msgs: Message[]) =>
      msgs.map((m) => ({
        role: m.role,
        content: m.content,
        timestamp: m.timestamp,
      })),
    [],
  );

  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    setError(null);
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: trimmed,
      timestamp: new Date().toISOString(),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setIsLoading(true);

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    try {
      const result = await sendCompanionMessage(
        trimmed,
        sessionId,
        buildHistory(updatedMessages),
      );

      if (result.error) {
        setError(result.error);
      } else if (result.text) {
        const assistantMessage: Message = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: result.text,
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
        if (result.sessionId) {
          setSessionId(result.sessionId);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, messages, sessionId, buildHistory]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Auto-resize textarea
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  };

  // Close on overlay click
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setIsOpen(false);
    }
  };

  // Drag-to-close state
  const dragStartY = useRef<number | null>(null);
  const dragCurrentY = useRef<number>(0);

  const handleDragStart = (e: React.TouchEvent | React.MouseEvent) => {
    const clientY = 'touches' in e ? e.touches[0]!.clientY : e.clientY;
    dragStartY.current = clientY;
  };

  const handleDragMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (dragStartY.current === null || !sheetRef.current) return;
    const clientY = 'touches' in e ? e.touches[0]!.clientY : e.clientY;
    const diff = clientY - dragStartY.current;
    if (diff > 0) {
      dragCurrentY.current = diff;
      sheetRef.current.style.transform = `translateY(${diff}px)`;
    }
  };

  const handleDragEnd = () => {
    if (dragCurrentY.current > 100) {
      setIsOpen(false);
    }
    if (sheetRef.current) {
      sheetRef.current.style.transform = '';
    }
    dragStartY.current = null;
    dragCurrentY.current = 0;
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  };

  return (
    <>
      {/* ----- Floating Button ----- */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className={`fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-sage-500 text-white shadow-lg hover:bg-sage-600 active:scale-95 transition-all duration-200 ${
            !hasPulsed ? 'animate-aria-pulse' : ''
          }`}
          aria-label="Open Aria chat"
        >
          <Heart className="h-6 w-6" fill="currentColor" />
        </button>
      )}

      {/* ----- Overlay + Sheet ----- */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/20 backdrop-blur-sm"
          onClick={handleOverlayClick}
          role="dialog"
          aria-modal="true"
          aria-label="Aria chat"
        >
          <div
            ref={sheetRef}
            className="w-full max-w-lg bg-white rounded-t-3xl shadow-2xl flex flex-col transition-transform duration-300 animate-aria-slide-up"
            style={{ height: 'min(70dvh, 480px)' }}
          >
            {/* Drag Handle */}
            <div
              className="flex-shrink-0 flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing touch-none select-none"
              onTouchStart={handleDragStart}
              onTouchMove={handleDragMove}
              onTouchEnd={handleDragEnd}
              onMouseDown={handleDragStart}
              onMouseMove={handleDragMove}
              onMouseUp={handleDragEnd}
            >
              <div className="h-1 w-10 rounded-full bg-stone-200" />
            </div>

            {/* Header */}
            <div className="flex-shrink-0 flex items-center justify-between px-5 pb-3 pt-1 border-b border-stone-100">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sage-500 text-white">
                  <Heart className="h-4 w-4" fill="currentColor" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-stone-800 leading-tight">
                    Aria
                  </h2>
                  <p className="text-xs text-stone-400">Your AI Companion</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-stone-400 hover:bg-stone-100 hover:text-stone-600 transition-colors"
                aria-label="Close chat"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {messages.length === 0 && !isLoading && (
                <div className="flex flex-col items-center justify-center h-full text-center px-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-sage-50 text-sage-400 mb-4">
                    <Heart className="h-6 w-6" />
                  </div>
                  <p className="text-sm text-stone-500 leading-relaxed max-w-[260px]">
                    Hi, I'm Aria -- your companion. Share what's on your mind.
                  </p>
                </div>
              )}

              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                      msg.role === 'user'
                        ? 'bg-sage-500 text-white rounded-br-md'
                        : 'bg-stone-100 text-stone-800 rounded-bl-md'
                    }`}
                  >
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {msg.content}
                    </p>
                    <p
                      className={`text-[10px] mt-1 ${
                        msg.role === 'user' ? 'text-white/60' : 'text-stone-400'
                      }`}
                    >
                      {formatTime(msg.timestamp)}
                    </p>
                  </div>
                </div>
              ))}

              {/* Typing indicator */}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-stone-100 rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-1.5">
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className="h-2 w-2 rounded-full bg-stone-400"
                        style={{
                          animation: `ariaTypingDot 1.2s ease-in-out ${(i * 0.2).toFixed(1)}s infinite`,
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Error message */}
              {error && (
                <div className="flex justify-center">
                  <p className="text-xs text-red-500 bg-red-50 rounded-xl px-3 py-2">
                    {error}
                  </p>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input area */}
            <div className="flex-shrink-0 border-t border-stone-100 px-4 py-3 bg-stone-50 rounded-b-none">
              <div className="flex items-end gap-2">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={handleTextareaChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Message Aria..."
                  rows={1}
                  className="flex-1 resize-none rounded-2xl border border-stone-200 bg-white px-4 py-2.5 text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-sage-500/30 focus:border-sage-400 transition-colors"
                  disabled={isLoading}
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-sage-500 text-white hover:bg-sage-600 disabled:opacity-40 disabled:hover:bg-sage-500 active:scale-95 transition-all duration-150"
                  aria-label="Send message"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ----- Keyframe animations ----- */}
      <style>{`
        @keyframes ariaSlideUp {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
        @keyframes ariaPulse {
          0%   { box-shadow: 0 0 0 0 rgba(90, 127, 90, 0.5); }
          70%  { box-shadow: 0 0 0 14px rgba(90, 127, 90, 0); }
          100% { box-shadow: 0 0 0 0 rgba(90, 127, 90, 0); }
        }
        @keyframes ariaTypingDot {
          0%, 60%, 100% { opacity: 0.3; transform: translateY(0); }
          30%           { opacity: 1;   transform: translateY(-4px); }
        }
        .animate-aria-slide-up {
          animation: ariaSlideUp 0.3s ease-out forwards;
        }
        .animate-aria-pulse {
          animation: ariaPulse 1.2s ease-in-out 2;
        }
      `}</style>
    </>
  );
}
