import { useCallback, useState } from 'react';
import { buildMentorSystemPrompt } from '@/lib/mentor-orchestrator';
import { inferMoodAdaptation } from '@/lib/mood-adapter';
import type { MentorProfile } from '@/lib/guest-context';
import type { ConversationMemoryEntry } from '@/lib/conversation-memory';

export interface ExtractedProfile {
  name?: string;
  location?: string;
  profession?: string;
  interests?: string[];
  hobbies?: string[];
  maritalStatus?: string;
  goals?: Array<{
    title: string;
    horizon: 'short' | 'medium' | 'long';
    description?: string;
  }>;
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface UseOnboardingConversationOptions {
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
  const [isProcessing, setIsProcessing] = useState(false);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [extractedProfile, setExtractedProfile] = useState<ExtractedProfile>({});
  const [error, setError] = useState<string | null>(null);

  const extractAndUpdateProfile = useCallback(async (conversation: ConversationMessage[]) => {
    try {
      const extractPrompt =
        'Extract profile data from this conversation. Return JSON with: name, location, profession, interests (array), hobbies (array), maritalStatus, goals (array with title, horizon, description). Only include what was explicitly shared.';

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `${extractPrompt}\n\nConversation: ${JSON.stringify(conversation)}`,
        }),
      });

      if (!response.ok) return;

      const data = await response.json();
      const extractedText = data.text || '{}';

      try {
        const jsonMatch = extractedText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const extracted = JSON.parse(jsonMatch[0]) as ExtractedProfile;
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
          setExtractedProfile((prev) => ({
            ...prev,
            ...extracted,
            interests: [...new Set([...(prev.interests || []), ...(extracted.interests || [])])],
            hobbies: [...new Set([...(prev.hobbies || []), ...(extracted.hobbies || [])])],
            goals: extracted.goals?.length
              ? [...(prev.goals || []), ...extracted.goals]
              : prev.goals,
          }));
        }
      } catch (parseErr) {
        console.error('Failed to parse extraction:', parseErr);
      }
    } catch (err) {
      console.error('Extraction error:', err);
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

        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: fullPrompt }),
        });

        if (!response.ok) throw new Error('Failed to get AI response');

        const data = await response.json();
        const aiResponse = data.text || "I'm here with you. Tell me more when you're ready.";

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
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: 'Take your time. I am here whenever you are ready to continue.',
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
      mentorProfile,
      messages,
      speakMessage,
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
