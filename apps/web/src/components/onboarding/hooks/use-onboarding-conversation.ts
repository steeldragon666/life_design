import { useCallback, useEffect, useRef, useState } from 'react';
import { computeAllPairCorrelations, detectSignificantPatterns } from '@life-design/core';
import { buildMentorSystemPrompt } from '@/lib/mentor-orchestrator';
import { inferMoodAdaptation } from '@/lib/mood-adapter';
import type { MentorProfile } from '@/lib/guest-context';
import type { ConversationMemoryEntry } from '@/lib/conversation-memory';
import { createAssistantFallbackMessage, fetchWithTimeout } from '@/lib/chat-resilience';
import {
  extractProfileDeterministically,
  mergeExtractedProfiles,
  parseExtractedProfileFromText,
  type ExtractedProfile,
} from '@/lib/onboarding-extraction';
import {
  clearOnboardingSessionInStorage,
  createOnboardingSessionPatchQueue,
  loadOnboardingSessionFromStorage,
  ONBOARDING_SESSION_STORAGE_KEY,
  parseOnboardingSession,
} from '@/lib/onboarding-session';

export type { ExtractedProfile };

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface UseOnboardingConversationOptions {
  userId?: string;
  mentorProfile: MentorProfile;
  checkins: Array<{ mood: number }>;
  conversationMemory: ConversationMemoryEntry[];
  appendConversationSummary: (summary: string, source: string) => void;
  appendConversationKeyFact: (fact: string, source: string) => void;
  speakMessage: (text: string) => void;
  onComplete: (profile: ExtractedProfile) => void;
  onSaveProfile: (data: any) => Promise<{ error: string | null }>;
  onCreateGoals: (goals: any[]) => Promise<{ error: string | null }>;
}

export function useOnboardingConversation({
  userId,
  mentorProfile,
  checkins,
  conversationMemory,
  appendConversationSummary,
  appendConversationKeyFact,
  speakMessage,
  onComplete,
  onSaveProfile,
  onCreateGoals,
}: UseOnboardingConversationOptions) {
  const getCorrelationInsights = useCallback(() => {
    if (checkins.length < 6) return [];
    const moodSeries = checkins.map((item) => item.mood);
    const moodDeltaSeries = moodSeries.map((value, index) =>
      index === 0 ? 0 : value - moodSeries[index - 1]
    );
    const matrix = computeAllPairCorrelations({ mood: moodSeries, mood_delta: moodDeltaSeries });
    return detectSignificantPatterns(matrix, 0.55).slice(0, 2).map((item) => ({
      dimensionA: item.keyA,
      dimensionB: item.keyB,
      coefficient: item.correlation,
      lagDays: item.bestLag,
      confidence: item.confidence,
    }));
  }, [checkins]);

  const getStreamingResponse = useCallback(
    async (payload: Record<string, unknown>) => {
      const response = await fetchWithTimeout('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, stream: true }),
      }, 20_000);
      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }
      if (!response.body) {
        const fallback = await response.json();
        return typeof fallback.text === 'string'
          ? fallback.text
          : createAssistantFallbackMessage('default');
      }

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
          const json = event.slice(6);
          try {
            const parsed = JSON.parse(json) as { type?: string; text?: string };
            if (parsed.type === 'chunk' && typeof parsed.text === 'string') {
              fullText += parsed.text;
            }
            if (parsed.type === 'done' && typeof parsed.text === 'string') {
              fullText = parsed.text;
            }
          } catch {
            // Ignore malformed chunk and continue.
          }
        }
      }
      return fullText || createAssistantFallbackMessage('default');
    },
    []
  );

  const [isProcessing, setIsProcessing] = useState(false);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [extractedProfile, setExtractedProfile] = useState<ExtractedProfile>({});
  const [error, setError] = useState<string | null>(null);
  const hydratedCheckpointRef = useRef(false);
  const restoredSessionRef = useRef(false);
  const patchQueueRef = useRef<ReturnType<typeof createOnboardingSessionPatchQueue> | null>(null);

  useEffect(() => {
    if (hydratedCheckpointRef.current) return;
    hydratedCheckpointRef.current = true;
    patchQueueRef.current = createOnboardingSessionPatchQueue(localStorage);
    try {
      const session = loadOnboardingSessionFromStorage(localStorage);
      if (session.messages.length > 0) setMessages(session.messages);
      if (Object.keys(session.extractedProfile).length > 0) {
        setExtractedProfile(session.extractedProfile);
      }
    } catch {
      // Ignore malformed checkpoint and continue gracefully.
    } finally {
      restoredSessionRef.current = true;
    }
    return () => {
      patchQueueRef.current?.flush();
      patchQueueRef.current?.dispose();
      patchQueueRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!restoredSessionRef.current || !patchQueueRef.current) return;
    try {
      patchQueueRef.current.schedule({
        messages,
        extractedProfile,
      });
    } catch {
      // Ignore persistence failures in constrained storage contexts.
    }
  }, [messages, extractedProfile]);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== ONBOARDING_SESSION_STORAGE_KEY || !event.newValue) return;
      const session = parseOnboardingSession(event.newValue);
      if (!session) return;
      setMessages(session.messages);
      setExtractedProfile(session.extractedProfile);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const extractAndUpdateProfile = useCallback(async (conversation: ConversationMessage[]) => {
    try {
      const extractPrompt =
        'Extract profile data from this conversation. Return JSON with: name, location, profession, interests (array), hobbies (array), maritalStatus, goals (array with title, horizon, description). Only include what was explicitly shared.';

      const response = await fetchWithTimeout('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `${extractPrompt}\n\nConversation: ${JSON.stringify(conversation)}`,
        }),
      }, 12_000);

      if (!response.ok) return;

      const data = await response.json();
      const extractedText = data.text || '{}';

      try {
        const extracted =
          parseExtractedProfileFromText(extractedText) ??
          extractProfileDeterministically(conversation);

        if (typeof extracted.name === 'string' && extracted.name.trim()) {
          appendConversationKeyFact(
            `User prefers to be called ${extracted.name.trim()}.`,
            'onboarding'
          );
        }
        if (typeof extracted.profession === 'string' && extracted.profession.trim()) {
          appendConversationKeyFact(
            `User profession: ${extracted.profession.trim()}.`,
            'onboarding'
          );
        }
        if (typeof extracted.location === 'string' && extracted.location.trim()) {
          appendConversationKeyFact(
            `User location context: ${extracted.location.trim()}.`,
            'onboarding'
          );
        }
        setExtractedProfile((prev) => mergeExtractedProfiles(prev, extracted));
      } catch (parseErr) {
        console.error('Failed to parse extraction:', parseErr);
        setExtractedProfile((prev) => mergeExtractedProfiles(prev, extractProfileDeterministically(conversation)));
      }
    } catch (err) {
      console.error('Extraction error:', err);
      setExtractedProfile((prev) => mergeExtractedProfiles(prev, extractProfileDeterministically(conversation)));
    }
  }, [appendConversationKeyFact]);

  const processUserMessage = useCallback(
    async (userMessage: string) => {
      if (!userMessage.trim()) return;

      setIsProcessing(true);
      try {
        setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);

        const conversationContext = messages.map((message) => ({
          role: message.role,
          content: message.content,
        }));

        const voiceName = mentorProfile.characterName || 'your guide';
        const mood = inferMoodAdaptation(checkins);
        const systemPrompt = buildMentorSystemPrompt(mentorProfile, 'onboarding', {
          mood,
          memory: conversationMemory,
        });
        const fullPrompt = `${systemPrompt}\n\nConversation:\n${JSON.stringify(
          conversationContext
        )}\n\nUser: "${userMessage}"\n\nRespond warmly and naturally, as ${voiceName}:`;

        const aiResponse = await getStreamingResponse({
          message: fullPrompt,
          correlationInsights: getCorrelationInsights(),
          includePersistedMemory: true,
          persistConversation: true,
          userId,
          source: 'onboarding',
        });

        setMessages((prev) => [...prev, { role: 'assistant', content: aiResponse }]);
        appendConversationSummary(
          `User shared: "${userMessage}". Mentor responded with supportive onboarding guidance.`,
          'onboarding'
        );
        speakMessage(aiResponse);

        await extractAndUpdateProfile([
          ...conversationContext,
          { role: 'user', content: userMessage },
          { role: 'assistant', content: aiResponse },
        ]);
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message.includes('timed out')
            ? 'Connection was slow. I switched to a gentle fallback response.'
            : 'Conversation interrupted. We can continue when you are ready.');
        }
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: createAssistantFallbackMessage('onboarding'),
          },
        ]);
      } finally {
        setIsProcessing(false);
      }
    },
    [
      appendConversationSummary,
      checkins,
      conversationMemory,
      extractAndUpdateProfile,
      getCorrelationInsights,
      getStreamingResponse,
      mentorProfile,
      messages,
      speakMessage,
      userId,
    ]
  );

  const handleManualComplete = useCallback(async () => {
    setIsProcessing(true);
    try {
      await onSaveProfile({
        name: extractedProfile.name,
        profession: extractedProfile.profession,
        interests: extractedProfile.interests || [],
        hobbies: extractedProfile.hobbies || [],
        skills: [],
        projects: [],
        postcode: extractedProfile.location,
        maritalStatus: extractedProfile.maritalStatus,
      });

      if (extractedProfile.goals?.length) {
        await onCreateGoals(extractedProfile.goals);
      }

      patchQueueRef.current?.dispose();
      clearOnboardingSessionInStorage(localStorage);
      onComplete(extractedProfile);
    } catch {
      setError('Failed to save. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  }, [extractedProfile, onComplete, onCreateGoals, onSaveProfile]);

  return {
    isProcessing,
    messages,
    setMessages,
    extractedProfile,
    error,
    setError,
    processUserMessage,
    handleManualComplete,
  };
}
