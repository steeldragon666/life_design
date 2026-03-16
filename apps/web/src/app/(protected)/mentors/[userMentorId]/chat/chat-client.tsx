'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import ChatBubble, { TypingIndicator } from '@/components/mentors/chat-bubble';
import type { ChatBubbleProps, PersonaBlend } from '@/components/mentors/chat-bubble';
import ChatInput from '@/components/mentors/chat-input';
import type { VoiceRecorderResult } from '@/components/mentors/voice-recorder';
import { sendMessage } from '../../actions';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import type { MentorArchetype } from '@/lib/mentor-archetypes';
import { archetypeToMentorType, getArchetypeConfig } from '@/lib/mentor-archetypes';
import { useElevenLabsTTS } from '@/hooks/useElevenLabsTTS';
import MentorAvatar from '@/components/mentors/mentor-avatar';

/* -------------------------------------------------------------------- */
/* Types                                                                  */
/* -------------------------------------------------------------------- */

type MessageType = 'text' | 'insight' | 'voice';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  type: MessageType;
  personaBlend?: PersonaBlend;
  suggestedFollowUps?: string[];
  timestamp: string;
  rating?: 'up' | 'down';
}

interface ChatClientProps {
  userMentorId: string;
  initialMessages: Array<{ role: string; content: string }>;
  mentorName?: string;
  archetype: MentorArchetype;
}

/* -------------------------------------------------------------------- */
/* Helpers                                                                */
/* -------------------------------------------------------------------- */

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function formatTimestamp(date: Date): string {
  return date.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: true });
}

/** Extract suggested follow-ups from assistant response text */
function extractFollowUps(text: string): string[] {
  /* Look for a section like "You might also ask:\n- ...\n- ..." */
  const match = text.match(/(?:you might|try asking|follow[- ]up[s]?)[:\s]+([^\n]+(?:\n[-•*] [^\n]+)*)/i);
  if (!match) return [];
  const raw = match[1] ?? '';
  return raw
    .split(/\n[-•*]\s+/)
    .map((s) => s.replace(/^[-•*]\s+/, '').trim())
    .filter((s) => s.length > 0 && s.length < 100)
    .slice(0, 3);
}

/** Detect if a message contains insight-like content */
function detectMessageType(content: string): MessageType {
  const insightKeywords = /insight|pattern|trend|correlat|notice|observ|data show|based on your/i;
  return insightKeywords.test(content) ? 'insight' : 'text';
}

/** Default persona blend – adjust based on mentor type in future */
const DEFAULT_BLEND: PersonaBlend = { therapist: 0.35, coach: 0.45, sage: 0.20 };

/* -------------------------------------------------------------------- */
/* Component                                                              */
/* -------------------------------------------------------------------- */

export default function ChatClient({
  userMentorId,
  initialMessages,
  mentorName = 'Your Mentor',
  archetype,
}: ChatClientProps) {
  const [messages, setMessages] = useState<Message[]>(() =>
    initialMessages.map((m) => ({
      id: generateId(),
      role: m.role as 'user' | 'assistant',
      content: m.content,
      type: m.role === 'assistant' ? detectMessageType(m.content) : 'text',
      personaBlend: m.role === 'assistant' ? DEFAULT_BLEND : undefined,
      timestamp: formatTimestamp(new Date()),
    })),
  );
  const [loading, setLoading] = useState(false);
  const [personaBlend] = useState<PersonaBlend>(DEFAULT_BLEND);
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Voice settings from localStorage
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [voiceSpeed, setVoiceSpeed] = useState(1.0);
  const [speakingMessageIdx, setSpeakingMessageIdx] = useState<number | null>(null);

  useEffect(() => {
    setVoiceEnabled(localStorage.getItem('ld:voice-enabled') === 'true');
    const saved = localStorage.getItem('ld:voice-speed');
    if (saved) setVoiceSpeed(parseFloat(saved));
  }, []);

  const { speak, stop, isSpeaking, isLoading: ttsLoading } = useElevenLabsTTS({
    speed: voiceSpeed,
    onSpeakEnd: () => setSpeakingMessageIdx(null),
  });

  const handleSpeak = useCallback((text: string, idx: number) => {
    setSpeakingMessageIdx(idx);
    speak(text, archetype);
  }, [speak, archetype]);

  /* Scroll to bottom on new messages */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  /* ------------------------------------------------------------------ */
  /* Send text message                                                    */
  /* ------------------------------------------------------------------ */
  const handleSend = useCallback(
    async (content: string) => {
      const userMsg: Message = {
        id: generateId(),
        role: 'user',
        content,
        type: 'text',
        timestamp: formatTimestamp(new Date()),
      };

      setMessages((prev) => [...prev, userMsg]);
      setLoading(true);

      try {
        const result = await sendMessage(userMentorId, archetypeToMentorType(archetype), content);

        if (result.text) {
          const followUps = extractFollowUps(result.text);
          const msgType = detectMessageType(result.text);

          const assistantMsg: Message = {
            id: generateId(),
            role: 'assistant',
            content: result.text,
            type: msgType,
            personaBlend,
            suggestedFollowUps: followUps,
            timestamp: formatTimestamp(new Date()),
          };

          setMessages((prev) => [...prev, assistantMsg]);
        }
      } catch {
        const errorMsg: Message = {
          id: generateId(),
          role: 'assistant',
          content: 'Something went wrong reaching your mentor. Please try again.',
          type: 'text',
          personaBlend,
          timestamp: formatTimestamp(new Date()),
        };
        setMessages((prev) => [...prev, errorMsg]);
      } finally {
        setLoading(false);
      }
    },
    [userMentorId, personaBlend, archetype],
  );

  /* ------------------------------------------------------------------ */
  /* Voice message handler                                                */
  /* ------------------------------------------------------------------ */
  const handleVoiceResult = useCallback(
    async (result: VoiceRecorderResult) => {
      const { transcription, duration, detectedEmotion } = result;

      if (!transcription) return;

      const userMsg: Message = {
        id: generateId(),
        role: 'user',
        content: transcription,
        type: 'voice',
        timestamp: formatTimestamp(new Date()),
      };

      setMessages((prev) => [...prev, userMsg]);
      setLoading(true);

      try {
        const aiResult = await sendMessage(
          userMentorId,
          archetypeToMentorType(archetype),
          `[Voice message, ${duration}s${detectedEmotion ? `, emotion: ${detectedEmotion}` : ''}]: ${transcription}`,
        );

        if (aiResult.text) {
          const followUps = extractFollowUps(aiResult.text);
          const assistantMsg: Message = {
            id: generateId(),
            role: 'assistant',
            content: aiResult.text,
            type: 'text',
            personaBlend,
            suggestedFollowUps: followUps,
            timestamp: formatTimestamp(new Date()),
          };
          setMessages((prev) => [...prev, assistantMsg]);
        }
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            id: generateId(),
            role: 'assistant',
            content: 'Something went wrong reaching your mentor. Please try again.',
            type: 'text',
            personaBlend,
            timestamp: formatTimestamp(new Date()),
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [userMentorId, personaBlend, archetype],
  );

  /* ------------------------------------------------------------------ */
  /* Message rating                                                       */
  /* ------------------------------------------------------------------ */
  function handleRate(messageId: string, rating: 'up' | 'down') {
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, rating } : m)),
    );
  }

  /* ------------------------------------------------------------------ */
  /* Render                                                               */
  /* ------------------------------------------------------------------ */

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)] max-w-3xl mx-auto">
      {/* ---- HEADER ---- */}
      <div className="flex-shrink-0 flex items-center justify-between mb-4 px-1">
        <div className="flex items-center gap-3">
          <Link
            href="/mentors"
            className="p-1.5 rounded-xl text-white/40 hover:text-white/80 hover:bg-white/10 transition-all duration-200"
            aria-label="Back to mentors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <MentorAvatar archetype={archetype} state={isSpeaking ? 'speaking' : 'idle'} size="md" />
              <div>
                <h1
                  className="text-lg font-semibold text-white"
                  style={{ fontFamily: '"Cabinet Grotesk", system-ui, sans-serif' }}
                >
                  {mentorName}
                </h1>
                <p className="text-xs text-white/50">{isSpeaking ? 'Speaking...' : getArchetypeConfig(archetype).label}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ---- MESSAGE LIST ---- */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-1 py-2 space-y-0"
        role="log"
        aria-label="Chat messages"
        aria-live="polite"
      >
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center px-8">
            <div
              className="h-16 w-16 rounded-2xl mb-4 flex items-center justify-center text-2xl shadow-xl"
              style={{
                background: `linear-gradient(135deg, #8b5cf6 ${Math.round(personaBlend.therapist * 100)}%, #f59e0b ${Math.round(personaBlend.therapist * 100) + Math.round(personaBlend.coach * 100)}%, #10b981)`,
              }}
              aria-hidden="true"
            >
              M
            </div>
            <h2
              className="text-lg font-semibold text-white mb-2"
              style={{ fontFamily: '"Cabinet Grotesk", system-ui, sans-serif' }}
            >
              Ready when you are
            </h2>
            <p
              className="text-sm text-white/40 max-w-xs leading-relaxed"
              style={{ fontFamily: '"Erode", Georgia, serif' }}
            >
              Ask anything about your life dimensions, goals, patterns, or wellbeing.
            </p>
          </div>
        )}

        {messages.map((msg, idx) => {
          const bubbleProps: ChatBubbleProps = {
            role: msg.role,
            content: msg.content,
            type: msg.type,
            personaBlend: msg.personaBlend,
            suggestedFollowUps: msg.suggestedFollowUps,
            onFollowUpClick: (q) => handleSend(q),
            onRate: msg.role === 'assistant' ? (r) => handleRate(msg.id, r) : undefined,
            timestamp: msg.timestamp,
            archetype: msg.role === 'assistant' ? archetype : undefined,
            onSpeak: msg.role === 'assistant' && voiceEnabled ? (text) => handleSpeak(text, idx) : undefined,
            speakingMessageId: speakingMessageIdx === idx ? String(idx) : undefined,
            messageId: String(idx),
          };
          return <ChatBubble key={msg.id} {...bubbleProps} />;
        })}

        {loading && <TypingIndicator personaBlend={personaBlend} archetype={archetype} />}

        <div ref={bottomRef} aria-hidden="true" />
      </div>

      {/* ---- INPUT AREA ---- */}
      <div className="flex-shrink-0 pt-3 border-t border-white/5">
        <ChatInput
          onSend={handleSend}
          onVoiceResult={handleVoiceResult}
          disabled={loading}
          loading={loading}
          placeholder="Ask your mentor anything..."
        />
      </div>
    </div>
  );
}
