'use client';

import { useMemo, useState } from 'react';
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
  const { mentorProfile, checkins, conversationMemory, appendConversationSummary } = useGuest();
  const [userInput, setUserInput] = useState('');
  const [response, setResponse] = useState('');
  const [draft, setDraft] = useState<GoalDraft | null>(null);
  const [loading, setLoading] = useState(false);

  const intro = useMemo(
    () => `${mentorProfile.characterName}: Tell me what matters most right now, and I will help shape it into a clear goal.`,
    [mentorProfile.characterName]
  );

  async function processInput() {
    if (!userInput.trim()) return;
    setLoading(true);
    try {
      const mood = inferMoodAdaptation(checkins);
      const systemPrompt = buildMentorSystemPrompt(mentorProfile, 'goals', {
        mood,
        memory: conversationMemory,
      });
      const message = `${systemPrompt}

User intent: "${userInput}"

Respond in two sections:
1) short supportive coaching reply
2) JSON object exactly:
{"title":"...","description":"...","horizon":"short|medium|long"}
`;
      const chatRes = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });
      const chatData = await chatRes.json();
      const text = chatData.text || 'Let us shape this with one small next step.';
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
