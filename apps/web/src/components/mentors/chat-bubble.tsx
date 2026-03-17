'use client';

import React, { useState } from 'react';
import { ThumbsUp, ThumbsDown, CaretDown, CaretUp, SpeakerHigh, Clock } from '@phosphor-icons/react';
import { InsightCardDS } from '@life-design/ui';

export interface PersonaBlend {
  therapist: number;
  coach: number;
  sage: number;
}

export interface InsightData {
  headline: string;
  body: string;
  dimension?: string;
  confidence?: number;
}

export interface VoiceData {
  duration: number;
  transcription: string;
  detectedEmotion?: string;
}

export interface ChatBubbleProps {
  role: 'user' | 'assistant';
  content: string;
  type?: 'text' | 'insight' | 'voice';
  personaBlend?: PersonaBlend;
  insight?: InsightData;
  voiceData?: VoiceData;
  suggestedFollowUps?: string[];
  onFollowUpClick?: (question: string) => void;
  onRate?: (rating: 'up' | 'down') => void;
  timestamp?: string;
}

/** Compute the dominant persona label from a blend */
function personaLabel(blend: PersonaBlend): string {
  const entries = Object.entries(blend) as [keyof PersonaBlend, number][];
  const dominant = entries.reduce((a, b) => (b[1] > a[1] ? b : a));
  const second = entries.filter((e) => e[0] !== dominant[0]).reduce((a, b) => (b[1] > a[1] ? b : a));

  const labels: Record<keyof PersonaBlend, string> = {
    therapist: 'Compassionate',
    coach: 'Strategic',
    sage: 'Wise',
  };

  return `${labels[dominant[0]]} ${dominant[0].charAt(0).toUpperCase() + dominant[0].slice(1)}`;
}

/** Derive gradient stops from persona blend */
function personaGradient(blend: PersonaBlend): string {
  const { therapist, coach, sage } = blend;
  // violet = therapist, amber = coach, emerald = sage
  const stops: string[] = [];
  if (therapist > 0.1) stops.push(`rgba(139,92,246,${Math.min(therapist + 0.3, 0.9)})`);
  if (coach > 0.1) stops.push(`rgba(245,158,11,${Math.min(coach + 0.3, 0.9)})`);
  if (sage > 0.1) stops.push(`rgba(16,185,129,${Math.min(sage + 0.3, 0.9)})`);
  if (stops.length === 0) stops.push('rgba(99,102,241,0.8)');
  return `linear-gradient(135deg, ${stops.join(', ')})`;
}

/** Format seconds to m:ss */
function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/** Emotion to emoji mapping */
const EMOTION_EMOJI: Record<string, string> = {
  joy: '😊',
  sadness: '😔',
  anger: '😤',
  fear: '😰',
  surprise: '😮',
  disgust: '😣',
  anticipation: '🤔',
  trust: '🤝',
  neutral: '😐',
};

export default function ChatBubble({
  role,
  content,
  type = 'text',
  personaBlend,
  insight,
  voiceData,
  suggestedFollowUps,
  onFollowUpClick,
  onRate,
  timestamp,
}: ChatBubbleProps) {
  const isUser = role === 'user';
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [rated, setRated] = useState<'up' | 'down' | null>(null);

  function handleRate(rating: 'up' | 'down') {
    setRated(rating);
    onRate?.(rating);
  }

  /* ------------------------------------------------------------------ */
  /* USER BUBBLE                                                          */
  /* ------------------------------------------------------------------ */
  if (isUser) {
    return (
      <div className="flex justify-end mb-3">
        <div className="max-w-[70%]">
          {type === 'voice' && voiceData ? (
            <div
              className="rounded-2xl rounded-tr-sm px-4 py-3"
              style={{ background: 'linear-gradient(135deg, #4f46e5, #6d28d9)' }}
            >
              <div className="flex items-center gap-3 mb-2">
                <SpeakerHigh className="h-4 w-4 text-indigo-200 flex-shrink-0" weight="regular" />
                <WaveformBars count={12} active={false} className="opacity-70" />
                <span
                  className="text-xs text-indigo-200 tabular-nums"
                  style={{ fontFamily: '"JetBrains Mono", monospace' }}
                >
                  {formatDuration(voiceData.duration)}
                </span>
                {voiceData.detectedEmotion && (
                  <span className="text-sm" title={voiceData.detectedEmotion}>
                    {EMOTION_EMOJI[voiceData.detectedEmotion] ?? '🎙️'}
                  </span>
                )}
              </div>
              {voiceData.transcription && (
                <p
                  className="text-sm text-indigo-100 leading-relaxed"
                  style={{ fontFamily: '"Erode", Georgia, serif' }}
                >
                  {voiceData.transcription}
                </p>
              )}
            </div>
          ) : (
            <div
              className="rounded-2xl rounded-tr-sm px-4 py-3"
              style={{ background: 'linear-gradient(135deg, #4f46e5, #6d28d9)' }}
            >
              <p
                className="text-sm text-white leading-relaxed whitespace-pre-wrap"
                style={{ fontFamily: '"Erode", Georgia, serif' }}
              >
                {content}
              </p>
            </div>
          )}
          {timestamp && (
            <p className="text-[11px] text-white/30 mt-1 text-right pr-1">{timestamp}</p>
          )}
        </div>
      </div>
    );
  }

  /* ------------------------------------------------------------------ */
  /* ASSISTANT BUBBLE                                                     */
  /* ------------------------------------------------------------------ */

  const defaultBlend: PersonaBlend = { therapist: 0.33, coach: 0.33, sage: 0.34 };
  const blend = personaBlend ?? defaultBlend;
  const gradient = personaGradient(blend);

  return (
    <div className="flex justify-start mb-4 gap-3">
      {/* Persona orb avatar */}
      <div className="flex-shrink-0 mt-1">
        <div
          className="h-8 w-8 rounded-full shadow-lg flex items-center justify-center text-xs font-bold text-white"
          style={{ background: gradient }}
          title={personaLabel(blend)}
          aria-label={`Mentor persona: ${personaLabel(blend)}`}
        >
          M
        </div>
      </div>

      <div className="flex-1 max-w-[75%]">
        {/* Persona label chip */}
        <p
          className="text-[11px] uppercase tracking-widest text-white/40 mb-1.5 ml-0.5"
          style={{ fontFamily: '"Cabinet Grotesk", system-ui, sans-serif' }}
        >
          {personaLabel(blend)}
        </p>

        {/* ----- INSIGHT TYPE ----- */}
        {type === 'insight' && insight ? (
          <div>
            <p
              className="text-xs text-white/50 mb-2 italic"
              style={{ fontFamily: '"Erode", Georgia, serif' }}
            >
              Based on your recent data...
            </p>
            <InsightCardDS
              headline={insight.headline}
              body={insight.body}
              dimension={insight.dimension}
              confidence={insight.confidence}
              className="w-full"
            />
            {content && content !== insight.body && (
              <div
                className="mt-3 rounded-2xl rounded-tl-sm bg-white/5 border border-white/10 px-4 py-3 backdrop-blur-sm"
              >
                <p
                  className="text-sm text-stone-200 leading-relaxed whitespace-pre-wrap"
                  style={{ fontFamily: '"Erode", Georgia, serif' }}
                >
                  {content}
                </p>
              </div>
            )}
          </div>
        ) : type === 'voice' && voiceData ? (
          /* ----- VOICE TYPE ----- */
          <div className="rounded-2xl rounded-tl-sm bg-white/5 border border-white/10 px-4 py-3 backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-2">
              <SpeakerHigh className="h-4 w-4 text-violet-400 flex-shrink-0" weight="regular" />
              <WaveformBars count={14} active={false} className="text-violet-400" />
              <span
                className="text-xs text-stone-500 tabular-nums flex items-center gap-1"
                style={{ fontFamily: '"JetBrains Mono", monospace' }}
              >
                <Clock className="h-3 w-3" weight="regular" />
                {formatDuration(voiceData.duration)}
              </span>
              {voiceData.detectedEmotion && (
                <span
                  className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/70"
                  title={`Detected emotion: ${voiceData.detectedEmotion}`}
                >
                  {EMOTION_EMOJI[voiceData.detectedEmotion] ?? '🎙️'} {voiceData.detectedEmotion}
                </span>
              )}
            </div>
            <p
              className="text-sm text-stone-200 leading-relaxed"
              style={{ fontFamily: '"Erode", Georgia, serif' }}
            >
              {content}
            </p>
            {voiceData.transcription && (
              <div className="mt-2 border-t border-white/10">
                <button
                  onClick={() => setTranscriptOpen((v) => !v)}
                  className="flex items-center gap-1.5 mt-2 text-[11px] uppercase tracking-wider text-stone-500 hover:text-white transition-colors"
                >
                  {transcriptOpen ? <CaretUp className="h-3 w-3" weight="regular" /> : <CaretDown className="h-3 w-3" weight="regular" />}
                  Transcription
                </button>
                {transcriptOpen && (
                  <p
                    className="mt-2 text-xs text-stone-500 leading-relaxed italic"
                    style={{ fontFamily: '"Erode", Georgia, serif' }}
                  >
                    {voiceData.transcription}
                  </p>
                )}
              </div>
            )}
          </div>
        ) : (
          /* ----- DEFAULT TEXT TYPE ----- */
          <div className="rounded-2xl rounded-tl-sm bg-white/5 border border-white/10 px-4 py-3 backdrop-blur-sm">
            <p
              className="text-sm text-stone-200 leading-relaxed whitespace-pre-wrap"
              style={{ fontFamily: '"Erode", Georgia, serif' }}
            >
              {content}
            </p>
          </div>
        )}

        {/* Suggested follow-up chips */}
        {suggestedFollowUps && suggestedFollowUps.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2.5">
            {suggestedFollowUps.map((q) => (
              <button
                key={q}
                onClick={() => onFollowUpClick?.(q)}
                className="text-xs px-3 py-1.5 rounded-full bg-white/5 border border-white/15 text-stone-300 hover:bg-white/10 hover:border-white/25 hover:text-white transition-all duration-200 active:scale-95"
                style={{ fontFamily: '"Erode", Georgia, serif' }}
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {/* Rating buttons */}
        {onRate && (
          <div className="flex items-center gap-2 mt-2 ml-0.5">
            <button
              onClick={() => handleRate('up')}
              className={`p-1.5 rounded-lg transition-all duration-200 ${
                rated === 'up'
                  ? 'text-emerald-400 bg-emerald-400/15'
                  : 'text-white/25 hover:text-emerald-400 hover:bg-emerald-400/10'
              }`}
              aria-label="Rate helpful"
              aria-pressed={rated === 'up'}
            >
              <ThumbsUp className="h-3.5 w-3.5" weight="regular" />
            </button>
            <button
              onClick={() => handleRate('down')}
              className={`p-1.5 rounded-lg transition-all duration-200 ${
                rated === 'down'
                  ? 'text-rose-400 bg-rose-400/15'
                  : 'text-white/25 hover:text-rose-400 hover:bg-rose-400/10'
              }`}
              aria-label="Rate unhelpful"
              aria-pressed={rated === 'down'}
            >
              <ThumbsDown className="h-3.5 w-3.5" weight="regular" />
            </button>
            {timestamp && (
              <span className="text-[11px] text-white/20 ml-auto">{timestamp}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------- */
/* WAVEFORM BARS — pure CSS animated bars                                */
/* -------------------------------------------------------------------- */
interface WaveformBarsProps {
  count?: number;
  active?: boolean;
  className?: string;
}

export function WaveformBars({ count = 12, active = false, className = '' }: WaveformBarsProps) {
  const heights = [4, 7, 10, 14, 10, 6, 12, 8, 14, 10, 6, 9, 12, 7];

  return (
    <span className={`inline-flex items-end gap-[2px] h-4 ${className}`} aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => {
        const h = heights[i % heights.length] ?? 8;
        return (
          <span
            key={i}
            className={`w-[2px] rounded-full flex-shrink-0 ${
              active ? 'bg-current opacity-90' : 'bg-current opacity-50'
            }`}
            style={{
              height: `${h}px`,
              animation: active
                ? `waveBar 0.8s ease-in-out ${(i * 0.07).toFixed(2)}s infinite alternate`
                : undefined,
            }}
          />
        );
      })}
      {active && (
        <style>{`
          @keyframes waveBar {
            from { transform: scaleY(0.4); }
            to   { transform: scaleY(1); }
          }
        `}</style>
      )}
    </span>
  );
}

/* -------------------------------------------------------------------- */
/* TYPING INDICATOR                                                       */
/* -------------------------------------------------------------------- */
export function TypingIndicator({ personaBlend }: { personaBlend?: PersonaBlend }) {
  const defaultBlend: PersonaBlend = { therapist: 0.33, coach: 0.33, sage: 0.34 };
  const blend = personaBlend ?? defaultBlend;
  const gradient = personaGradient(blend);

  return (
    <div className="flex justify-start mb-4 gap-3">
      <div className="flex-shrink-0 mt-1">
        <div
          className="h-8 w-8 rounded-full shadow-lg flex items-center justify-center text-xs font-bold text-white"
          style={{ background: gradient }}
          aria-label="Mentor is thinking"
        >
          M
        </div>
      </div>
      <div className="rounded-2xl rounded-tl-sm bg-white/5 border border-white/10 px-4 py-3 backdrop-blur-sm flex items-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-2 w-2 rounded-full bg-stone-400"
            style={{
              animation: `typingDot 1.2s ease-in-out ${(i * 0.2).toFixed(1)}s infinite`,
            }}
          />
        ))}
        <style>{`
          @keyframes typingDot {
            0%, 60%, 100% { opacity: 0.3; transform: translateY(0); }
            30%            { opacity: 1;   transform: translateY(-4px); }
          }
        `}</style>
      </div>
    </div>
  );
}
