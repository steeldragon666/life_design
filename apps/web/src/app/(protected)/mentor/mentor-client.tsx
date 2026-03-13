'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import ChatBubble, { TypingIndicator } from '@/components/mentors/chat-bubble';
import type { ChatBubbleProps, PersonaBlend } from '@/components/mentors/chat-bubble';
import ChatInput from '@/components/mentors/chat-input';
import PersonaDisplay from '@/components/mentors/persona-display';
import type { VoiceRecorderResult } from '@/components/mentors/voice-recorder';
import { createClient } from '@/lib/supabase/client';
import {
  Sparkles,
  PanelLeftClose,
  PanelLeftOpen,
  MessageSquare,
  History,
  Sliders,
  Plus,
  Clock,
} from 'lucide-react';

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

interface ChatSession {
  id: string;
  title: string;
  preview: string;
  date: string;
}

interface MentorClientProps {
  userMentorId: string | null;
  initialPersonaBlend?: PersonaBlend;
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

function extractFollowUps(text: string): string[] {
  const match = text.match(/(?:you might|try asking|follow[- ]up[s]?)[:\s]+([^\n]+(?:\n[-•*] [^\n]+)*)/i);
  if (!match) return [];
  const raw = match[1] ?? '';
  return raw
    .split(/\n[-•*]\s+/)
    .map((s) => s.replace(/^[-•*]\s+/, '').trim())
    .filter((s) => s.length > 0 && s.length < 100)
    .slice(0, 3);
}

function detectMessageType(content: string): MessageType {
  const insightKeywords = /insight|pattern|trend|correlat|notice|observ|data show|based on your/i;
  return insightKeywords.test(content) ? 'insight' : 'text';
}

function buildWelcomeMessage(blend: PersonaBlend): string {
  const { therapist, coach, sage } = blend;
  const dominant =
    therapist >= coach && therapist >= sage
      ? 'therapist'
      : coach >= sage
      ? 'coach'
      : 'sage';

  const greetings: Record<string, string> = {
    therapist:
      "Hello. I'm here to listen and reflect with you. This is a safe space — you can share whatever is on your mind, and we'll explore it together at your own pace. What's been weighing on you lately?",
    coach:
      "Great to connect with you. I'm ready to help you cut through the noise and make real progress on what matters most. What goal or challenge are we tackling today?",
    sage:
      "Welcome. Every conversation is an opportunity to see yourself more clearly. What question or intention brings you here today?",
  };

  return greetings[dominant] ?? greetings.coach!;
}

const DEFAULT_BLEND: PersonaBlend = { therapist: 0.35, coach: 0.45, sage: 0.20 };

/* -------------------------------------------------------------------- */
/* Sidebar component                                                      */
/* -------------------------------------------------------------------- */

interface SidebarProps {
  sessions: ChatSession[];
  blend: PersonaBlend;
  onBlendChange: (blend: PersonaBlend) => void;
  onNewChat: () => void;
  onLoadSession: (id: string) => void;
}

function MentorSidebar({
  sessions,
  blend,
  onBlendChange,
  onNewChat,
  onLoadSession,
}: SidebarProps) {
  const [activeTab, setActiveTab] = useState<'history' | 'persona'>('history');

  const PERSONA_CONFIGS = [
    { key: 'therapist' as keyof PersonaBlend, label: 'Therapist', color: '#8b5cf6', emoji: '💜' },
    { key: 'coach' as keyof PersonaBlend, label: 'Coach', color: '#f59e0b', emoji: '🏆' },
    { key: 'sage' as keyof PersonaBlend, label: 'Sage', color: '#10b981', emoji: '🌿' },
  ];

  function handleSliderChange(key: keyof PersonaBlend, value: number) {
    /* Adjust the other two sliders proportionally so they sum to 1 */
    const others = PERSONA_CONFIGS.filter((p) => p.key !== key);
    const remaining = 1 - value;
    const currentOtherSum = others.reduce((s, p) => s + blend[p.key], 0);
    const newBlend = { ...blend, [key]: value };
    if (currentOtherSum > 0) {
      others.forEach((p) => {
        newBlend[p.key] = (blend[p.key] / currentOtherSum) * remaining;
      });
    } else {
      const share = remaining / 2;
      others.forEach((p) => { newBlend[p.key] = share; });
    }
    onBlendChange(newBlend);
  }

  return (
    <div className="flex flex-col h-full">
      {/* New chat button */}
      <button
        onClick={onNewChat}
        className="flex items-center gap-2 w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white/70 hover:bg-white/10 hover:text-white transition-all duration-200 mb-4 active:scale-95"
        aria-label="Start new chat"
      >
        <Plus className="h-4 w-4 flex-shrink-0" />
        <span style={{ fontFamily: '"Cabinet Grotesk", system-ui, sans-serif' }}>New conversation</span>
      </button>

      {/* Tab switcher */}
      <div className="flex rounded-xl bg-white/5 p-0.5 mb-4" role="tablist">
        <button
          role="tab"
          aria-selected={activeTab === 'history'}
          onClick={() => setActiveTab('history')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
            activeTab === 'history'
              ? 'bg-white/10 text-white shadow'
              : 'text-white/40 hover:text-white/60'
          }`}
        >
          <History className="h-3.5 w-3.5" />
          History
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'persona'}
          onClick={() => setActiveTab('persona')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
            activeTab === 'persona'
              ? 'bg-white/10 text-white shadow'
              : 'text-white/40 hover:text-white/60'
          }`}
        >
          <Sliders className="h-3.5 w-3.5" />
          Persona
        </button>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto" role="tabpanel">
        {activeTab === 'history' && (
          <div className="space-y-1.5">
            {sessions.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="h-8 w-8 text-white/15 mx-auto mb-2" />
                <p className="text-xs text-white/30" style={{ fontFamily: '"Erode", Georgia, serif' }}>
                  No previous conversations
                </p>
              </div>
            ) : (
              sessions.map((session) => (
                <button
                  key={session.id}
                  onClick={() => onLoadSession(session.id)}
                  className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-white/5 transition-all duration-200 group"
                  aria-label={`Load conversation: ${session.title}`}
                >
                  <div className="flex items-start gap-2">
                    <Clock className="h-3.5 w-3.5 text-white/20 mt-0.5 flex-shrink-0 group-hover:text-white/40 transition-colors" />
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-xs font-medium text-white/60 group-hover:text-white/80 truncate transition-colors"
                        style={{ fontFamily: '"Cabinet Grotesk", system-ui, sans-serif' }}
                      >
                        {session.title}
                      </p>
                      <p className="text-[10px] text-white/25 mt-0.5 truncate"
                        style={{ fontFamily: '"Erode", Georgia, serif' }}
                      >
                        {session.preview}
                      </p>
                      <p
                        className="text-[10px] text-white/20 mt-1"
                        style={{ fontFamily: '"JetBrains Mono", monospace' }}
                      >
                        {session.date}
                      </p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        )}

        {activeTab === 'persona' && (
          <div className="space-y-3">
            <p
              className="text-xs text-white/40 leading-relaxed mb-4"
              style={{ fontFamily: '"Erode", Georgia, serif' }}
            >
              Adjust the blend to shape how your mentor communicates with you.
            </p>
            {PERSONA_CONFIGS.map((p) => {
              const pct = Math.round(blend[p.key] * 100);
              return (
                <div key={p.key} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span
                      className="text-xs text-white/60"
                      style={{ fontFamily: '"Cabinet Grotesk", system-ui, sans-serif' }}
                    >
                      {p.emoji} {p.label}
                    </span>
                    <span
                      className="text-[11px] tabular-nums font-medium"
                      style={{ color: p.color, fontFamily: '"JetBrains Mono", monospace' }}
                    >
                      {pct}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={pct}
                    onChange={(e) => handleSliderChange(p.key, Number(e.target.value) / 100)}
                    className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, ${p.color} 0% ${pct}%, rgba(255,255,255,0.1) ${pct}% 100%)`,
                      accentColor: p.color,
                    }}
                    aria-label={`${p.label} weight: ${pct}%`}
                    aria-valuenow={pct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  />
                </div>
              );
            })}
            <div className="mt-4 pt-3 border-t border-white/5">
              <PersonaDisplay blend={blend} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------- */
/* Main component                                                         */
/* -------------------------------------------------------------------- */

export default function MentorClient({
  userMentorId,
  initialPersonaBlend,
}: MentorClientProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [personaBlend, setPersonaBlend] = useState<PersonaBlend>(
    initialPersonaBlend ?? DEFAULT_BLEND,
  );
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [currentSessionId] = useState<string>(generateId());

  const bottomRef = useRef<HTMLDivElement>(null);

  /* Welcome message on mount */
  useEffect(() => {
    const welcome: Message = {
      id: generateId(),
      role: 'assistant',
      content: buildWelcomeMessage(personaBlend),
      type: 'text',
      personaBlend,
      suggestedFollowUps: [
        'How am I doing overall?',
        'What should I focus on?',
        'Reflect on my recent week',
      ],
      timestamp: formatTimestamp(new Date()),
    };
    setMessages([welcome]);
  // Only run on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Load chat sessions from Supabase */
  useEffect(() => {
    if (!userMentorId) return;
    async function loadSessions() {
      const supabase = createClient();
      const { data } = await supabase
        .from('mentor_messages')
        .select('id, content, created_at')
        .eq('user_mentor_id', userMentorId!)
        .eq('role', 'user')
        .order('created_at', { ascending: false })
        .limit(20);

      if (!data) return;

      /* Group into sessions (new session = gap > 2 hours) */
      const sessions: ChatSession[] = [];
      let sessionStart: string | null = null;
      let sessionTitle: string | null = null;

      data.forEach((msg, i) => {
        const date = new Date(msg.created_at as string);
        const isNewSession =
          !sessionStart ||
          new Date(sessionStart).getTime() - date.getTime() > 2 * 60 * 60 * 1000;

        if (isNewSession || i === 0) {
          sessionStart = msg.created_at as string;
          sessionTitle = (msg.content as string).slice(0, 40) + '…';
          sessions.push({
            id: `session-${i}`,
            title: sessionTitle,
            preview: (msg.content as string).slice(0, 60),
            date: date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }),
          });
        }
      });

      setChatSessions(sessions);
    }
    loadSessions();
  }, [userMentorId]);

  /* Auto-scroll */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  /* ------------------------------------------------------------------ */
  /* Send text message                                                    */
  /* ------------------------------------------------------------------ */
  const handleSend = useCallback(
    async (content: string) => {
      if (!userMentorId) {
        /* Fallback: show a mock response when no mentor is configured */
        const userMsg: Message = {
          id: generateId(),
          role: 'user',
          content,
          type: 'text',
          timestamp: formatTimestamp(new Date()),
        };
        setMessages((prev) => [...prev, userMsg]);
        setLoading(true);
        await new Promise<void>((res) => setTimeout(res, 1200));
        setLoading(false);
        const mockResponse: Message = {
          id: generateId(),
          role: 'assistant',
          content:
            'To get personalised responses, please activate a mentor from the Mentors page. Your mentor will then be able to draw on your real data to provide tailored guidance.',
          type: 'text',
          personaBlend,
          timestamp: formatTimestamp(new Date()),
        };
        setMessages((prev) => [...prev, mockResponse]);
        return;
      }

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
        /* Dynamically import the server action to avoid bundling on client */
        const { sendMessage } = await import('../mentors/actions');
        const result = await sendMessage(userMentorId, 'stoic', content);

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
        setMessages((prev) => [
          ...prev,
          {
            id: generateId(),
            role: 'assistant',
            content: 'Something went wrong. Please try again.',
            type: 'text',
            personaBlend,
            timestamp: formatTimestamp(new Date()),
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [userMentorId, personaBlend],
  );

  /* ------------------------------------------------------------------ */
  /* Voice handler                                                        */
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

      const prompt = `[Voice message, ${duration}s${detectedEmotion ? `, emotion: ${detectedEmotion}` : ''}]: ${transcription}`;
      await handleSend(prompt);
    },
    [handleSend],
  );

  /* ------------------------------------------------------------------ */
  /* Rating                                                               */
  /* ------------------------------------------------------------------ */
  function handleRate(messageId: string, rating: 'up' | 'down') {
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, rating } : m)),
    );
  }

  /* ------------------------------------------------------------------ */
  /* New chat                                                             */
  /* ------------------------------------------------------------------ */
  function handleNewChat() {
    const welcome: Message = {
      id: generateId(),
      role: 'assistant',
      content: buildWelcomeMessage(personaBlend),
      type: 'text',
      personaBlend,
      suggestedFollowUps: [
        'How am I doing overall?',
        'What should I focus on?',
        'Reflect on my recent week',
      ],
      timestamp: formatTimestamp(new Date()),
    };
    setMessages([welcome]);
  }

  /* ------------------------------------------------------------------ */
  /* Render                                                               */
  /* ------------------------------------------------------------------ */

  return (
    <div className="flex h-[calc(100vh-6rem)] gap-4">
      {/* ---- SIDEBAR ---- */}
      {sidebarOpen && (
        <aside
          className="w-64 flex-shrink-0 rounded-2xl bg-white/[0.03] border border-white/[0.06] backdrop-blur-sm p-4 flex flex-col"
          aria-label="Mentor sidebar"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-indigo-400" />
              <span
                className="text-sm font-semibold text-white"
                style={{ fontFamily: '"Cabinet Grotesk", system-ui, sans-serif' }}
              >
                Mentor
              </span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-1 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/10 transition-all duration-200"
              aria-label="Close sidebar"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          </div>
          <MentorSidebar
            sessions={chatSessions}
            blend={personaBlend}
            onBlendChange={setPersonaBlend}
            onNewChat={handleNewChat}
            onLoadSession={() => { /* future: load historical session */ }}
          />
        </aside>
      )}

      {/* ---- MAIN CHAT AREA ---- */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-1.5 rounded-xl text-white/40 hover:text-white/80 hover:bg-white/10 transition-all duration-200"
                aria-label="Open sidebar"
              >
                <PanelLeftOpen className="h-4 w-4" />
              </button>
            )}
            <div>
              <h1
                className="text-xl font-bold text-white"
                style={{ fontFamily: '"Cabinet Grotesk", system-ui, sans-serif' }}
              >
                AI Mentor
              </h1>
              <PersonaDisplay blend={personaBlend} compact className="mt-0.5" />
            </div>
          </div>
          <button
            onClick={handleNewChat}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white/60 hover:bg-white/10 hover:text-white transition-all duration-200 active:scale-95"
            aria-label="Start new conversation"
          >
            <Plus className="h-3.5 w-3.5" />
            New
          </button>
        </div>

        {/* Message list */}
        <div
          className="flex-1 overflow-y-auto rounded-2xl bg-white/[0.02] border border-white/[0.05] backdrop-blur-sm px-4 py-4"
          role="log"
          aria-label="Chat conversation"
          aria-live="polite"
          id={`chat-session-${currentSessionId}`}
        >
          {messages.map((msg) => {
            const bubbleProps: ChatBubbleProps = {
              role: msg.role,
              content: msg.content,
              type: msg.type,
              personaBlend: msg.personaBlend,
              suggestedFollowUps: msg.suggestedFollowUps,
              onFollowUpClick: (q) => handleSend(q),
              onRate: msg.role === 'assistant' ? (r) => handleRate(msg.id, r) : undefined,
              timestamp: msg.timestamp,
            };
            return <ChatBubble key={msg.id} {...bubbleProps} />;
          })}

          {loading && <TypingIndicator personaBlend={personaBlend} />}

          <div ref={bottomRef} aria-hidden="true" />
        </div>

        {/* Input */}
        <div className="flex-shrink-0 pt-3">
          <ChatInput
            onSend={handleSend}
            onVoiceResult={handleVoiceResult}
            disabled={loading}
            loading={loading}
            placeholder="Ask your mentor anything..."
          />
        </div>
      </div>
    </div>
  );
}
