'use client';

import { useMemo, useState } from 'react';
import { ALL_DIMENSIONS, computeAllPairCorrelations, detectSignificantPatterns } from '@life-design/core';
import { Mic, Loader2, MessageSquare, Sparkles } from 'lucide-react';
import { buildMentorSystemPrompt } from '@/lib/mentor-orchestrator';
import { useGuest } from '@/lib/guest-context';
import { inferMoodAdaptation } from '@/lib/mood-adapter';

interface GoalDraft {
  title: string;
  description?: string;
  horizon: 'short' | 'medium' | 'long';
}

interface VoiceGoalCreatorProps {
  onCreateGoal: (goal: GoalDraft) => Promise<void>;
}

export default function VoiceGoalCreator({ onCreateGoal }: VoiceGoalCreatorProps) {
  const { profile, mentorProfile, checkins, conversationMemory, appendConversationSummary } = useGuest();
  const [userInput, setUserInput] = useState('');
  const [response, setResponse] = useState('');
  const [draft, setDraft] = useState<GoalDraft | null>(null);
  const [loading, setLoading] = useState(false);

  const intro = useMemo(
    () => `${mentorProfile.characterName}: Tell me what matters most right now, and I will help shape it into a clear goal.`,
    [mentorProfile.characterName]
  );

  const correlationInsights = useMemo(() => {
    if (checkins.length < 7) return [];
    const sorted = [...checkins].sort((a, b) => a.date.localeCompare(b.date));
    const byDimension = ALL_DIMENSIONS.reduce<Record<string, number[]>>((acc, dimension) => {
      acc[dimension] = [];
      return acc;
    }, {});
    sorted.forEach((checkin) => {
      const scoreMap = new Map(checkin.dimension_scores.map((item) => [item.dimension, item.score] as const));
      ALL_DIMENSIONS.forEach((dimension) => {
        const score = scoreMap.get(dimension);
        byDimension[dimension].push(typeof score === 'number' ? score : Number.NaN);
      });
    });
    const matrix = computeAllPairCorrelations(byDimension);
    return detectSignificantPatterns(matrix, 0.55).slice(0, 3).map((pattern) => ({
      dimensionA: pattern.keyA,
      dimensionB: pattern.keyB,
      coefficient: pattern.correlation,
      lagDays: pattern.bestLag,
      confidence: pattern.confidence,
    }));
  }, [checkins]);

  async function readSseCompletion(response: Response): Promise<string> {
    if (!response.body) return '';
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullText = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split('\n\n');
      buffer = events.pop() ?? '';
      for (const event of events) {
        if (!event.startsWith('data: ')) continue;
        try {
          const parsed = JSON.parse(event.slice(6)) as { type?: string; text?: string };
          if (parsed.type === 'chunk' && typeof parsed.text === 'string') {
            fullText += parsed.text;
          }
          if (parsed.type === 'done' && typeof parsed.text === 'string') {
            fullText = parsed.text;
          }
        } catch {
          // Ignore malformed chunks and continue stream parsing.
        }
      }
    }
    return fullText;
  }

  async function processInput() {
    if (!userInput.trim()) return;
    setLoading(true);
    try {
      const mood = inferMoodAdaptation(checkins);
      const systemPrompt = buildMentorSystemPrompt(mentorProfile, 'goals', {
        mood,
        memory: conversationMemory,
      });
      const message = `User intent: "${userInput}"

Respond in two sections:
1) short supportive coaching reply
2) JSON object exactly:
{"title":"...","description":"...","horizon":"short|medium|long"}`;
      const chatRes = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          systemPrompt,
          stream: true,
          correlationInsights,
          includePersistedMemory: true,
          persistConversation: true,
          userId: profile?.id,
          source: 'goals',
        }),
      });
      if (!chatRes.ok) {
        throw new Error('Unable to generate goal guidance right now.');
      }
      const text = (await readSseCompletion(chatRes)) || 'Let us shape this with one small next step.';
      setResponse(text);
      appendConversationSummary(`Goal discussion: "${userInput}"`, 'goals');

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as GoalDraft;
        if (parsed.title && parsed.horizon) {
          setDraft(parsed);
        }
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="h-4 w-4 text-cyan-300" />
          <p className="text-sm text-cyan-200">{intro}</p>
        </div>
        <div className="flex gap-2">
          <input
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder="Speak or type your goal intention..."
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-500"
          />
          <button
            onClick={processInput}
            disabled={loading}
            className="btn-primary inline-flex items-center gap-2"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
            Guide
          </button>
        </div>
      </div>

      {response && (
        <div className="glass-card p-5">
          <p className="text-slate-200 whitespace-pre-wrap text-sm">{response}</p>
        </div>
      )}

      {draft && (
        <div className="glass-card p-5 space-y-3">
          <p className="text-white font-semibold">Goal Draft</p>
          <p className="text-slate-300 text-sm">{draft.title}</p>
          {draft.description && <p className="text-slate-400 text-sm">{draft.description}</p>}
          <p className="text-xs text-cyan-300 uppercase tracking-wider">{draft.horizon} horizon</p>
          <button
            onClick={() => onCreateGoal(draft)}
            className="btn-secondary inline-flex items-center gap-2"
          >
            <Mic className="h-4 w-4" />
            Save this goal
          </button>
        </div>
      )}
    </div>
  );
}
