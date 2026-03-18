'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ChevronLeft,
  Crown,
  Flower2,
  Loader2,
  MessageSquare,
  Mic,
  Sparkles,
  Square,
  Volume2,
  Waves,
  X,
} from 'lucide-react';
import { useTheme } from '@/components/theme/theme-provider';
import { useGuest } from '@/lib/guest-context';
import { VOICE_OPTIONS } from '@/components/voice/voice-selector';
import ArchetypeSelector from '@/components/mentor/archetype-selector';
import {
  getArchetypeConfig,
  getRecommendedVoiceForArchetype,
  type MentorArchetype,
} from '@/lib/mentor-archetypes';
import GlassContainer, { GlassCard, WaveDivider } from './glass-container';
import { useFlowState } from './flow-state';
import { useOnboardingConversation, type ExtractedProfile } from './hooks/use-onboarding-conversation';
import { useSpeechRecognition } from './hooks/use-speech-recognition';
import { useSpeechSynthesis } from './hooks/use-speech-synthesis';
import { ConversationMessages } from './voice/conversation-messages';
import { ProfilePreviewPanel } from './voice/profile-preview-panel';
import { VoiceOptionCard } from './voice/voice-option-card';
import { cn } from '@/lib/utils';

interface VoiceOnboardingAgentProps {
  onComplete: (profile: ExtractedProfile) => void;
  onSaveProfile: (data: Record<string, unknown>) => Promise<{ error: string | null }>;
  onCreateGoals: (goals: Array<{ horizon?: string; [key: string]: unknown }>) => Promise<{ error: string | null }>;
}

const themes = [
  {
    id: 'botanical' as const,
    name: 'Ethereal Botanical',
    description: 'Soft pinks, gentle purples, and organic warmth',
    icon: Flower2,
    colors: ['#e8b4d0', '#c5b8d4', '#b8c5a8'],
  },
  {
    id: 'ocean' as const,
    name: 'Ocean Zen',
    description: 'Calming teals and water ripples',
    icon: Waves,
    colors: ['#5fb3b3', '#8fd4d4', '#b8e6e6'],
  },
  {
    id: 'modern' as const,
    name: 'Dark Modern',
    description: 'Sophisticated dark tones with warm gold',
    icon: Crown,
    colors: ['#c9a86c', '#d4a574', '#b87333'],
  },
];

const WELCOME_MESSAGE =
  "Welcome to your Life Design journey. I'm here to create a calm, safe space where you can explore your thoughts, dreams, and aspirations without judgment.";

export default function VoiceOnboardingAgent({
  onComplete,
  onSaveProfile,
  onCreateGoals,
}: VoiceOnboardingAgentProps) {
  const { theme: currentTheme, setTheme } = useTheme();
  const {
    profile,
    voicePreference,
    setVoicePreference,
    mentorProfile,
    setMentorProfile,
    checkins,
    conversationMemory,
    appendConversationSummary,
    appendConversationKeyFact,
  } = useGuest();
  const {
    currentStep,
    setTheme: setFlowTheme,
    setArchetype: setFlowArchetype,
    setVoice: setFlowVoice,
    nextStep,
    goBack,
  } = useFlowState();

  const [textInput, setTextInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const {
    isSpeaking,
    supportsSpeechSynthesis,
    speakMessage,
    stopSpeaking,
    previewVoiceOption,
  } = useSpeechSynthesis({ voicePreference });

  const {
    isProcessing,
    messages,
    setMessages,
    extractedProfile,
    error,
    sessionNotice,
    dismissSessionNotice,
    setError,
    processUserMessage,
    handleManualComplete,
  } = useOnboardingConversation({
    userId: profile?.id,
    mentorProfile,
    checkins,
    conversationMemory,
    appendConversationSummary,
    appendConversationKeyFact,
    speakMessage,
    onComplete,
    onSaveProfile,
    onCreateGoals,
  });

  const processMessage = useCallback(async (value: string) => {
    await processUserMessage(value);
  }, [processUserMessage]);

  const {
    isRecording,
    transcript,
    supportsSpeechRecognition,
    startRecording,
    stopRecording,
  } = useSpeechRecognition({
    onSubmitTranscript: processMessage,
    onErrorChange: setError,
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleThemeSelection = (themeId: 'botanical' | 'ocean' | 'modern') => {
    setTheme(themeId);
    setFlowTheme(themeId);

    const themeResponses: Record<string, string> = {
      botanical:
        'Beautiful choice. The Ethereal Botanical theme brings soft, organic warmth to your space—like a quiet garden where your thoughts can bloom freely.',
      ocean:
        'Wonderful. The Ocean Zen theme surrounds you with calming teals and the gentle rhythm of water—a space for clarity and flow.',
      modern:
        'Excellent. The Dark Modern theme offers sophisticated simplicity—a focused, distraction-free space for deep reflection.',
    };

    const response = themeResponses[themeId];
    setMessages([
      { role: 'assistant', content: WELCOME_MESSAGE },
      {
        role: 'user',
        content: `I'd like the ${themes.find((theme) => theme.id === themeId)?.name} theme`,
      },
      { role: 'assistant', content: response },
    ]);

    nextStep();
  };

  const handleVoiceSelection = (voiceId: string) => {
    setVoicePreference(voiceId);
    setFlowVoice(voiceId);
    setMentorProfile({ voiceId });

    const voice = VOICE_OPTIONS.find((item) => item.id === voiceId);
    const voiceResponses: Record<string, string> = {
      'calm-british-female':
        "Lovely to meet you. I'm Eleanor, and I'm here to walk alongside you as you explore your life design. There's no rush—we'll take this one gentle step at a time.\n\nTo begin, may I ask your name?",
      'warm-american-male':
        "Hey there. I'm Theo, and I'm honored to be part of your journey. This is your space to reflect, dream, and grow. I'm here to listen and support you.\n\nLet's start simple—what's your name?",
      'soft-australian-female':
        "Hello, lovely to meet you. I'm Maya, and I'm so glad you're here. This is your time to breathe, reflect, and envision the life you want.\n\nTo get started, what name do you go by?",
    };

    const response = voiceResponses[voiceId];
    setMessages((prev) => [
      ...prev,
      { role: 'user', content: `I'd like ${voice?.name} as my companion` },
      { role: 'assistant', content: response },
    ]);

    nextStep();
    setTimeout(() => speakMessage(response), 300);
  };

  const handleArchetypeSelection = (archetype: MentorArchetype) => {
    const cfg = getArchetypeConfig(archetype);
    const recommendedVoice = getRecommendedVoiceForArchetype(archetype);
    setFlowArchetype(archetype);
    setMentorProfile({
      archetype,
      characterName: cfg.characterName,
      style: {
        opening: cfg.openingStyle,
        affirmation: cfg.affirmationStyle,
        promptStyle: cfg.promptStyle,
      },
      voiceId: recommendedVoice,
    });
    setVoicePreference(recommendedVoice);

    setMessages((prev) => [
      ...prev,
      { role: 'assistant', content: `Beautiful. I'll guide you as your ${cfg.label}.` },
    ]);
    nextStep();
  };

  const sendTextMessage = async () => {
    if (!textInput.trim()) return;
    await processMessage(textInput);
    setTextInput('');
  };

  if (currentStep === 'theme') {
    return (
      <div className="animate-step-enter">
        <GlassContainer size="xl" variant="ocean">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-400/20 to-teal-400/20 mb-4">
              <Sparkles className="w-8 h-8 text-cyan-300" />
            </div>
            <h2 className="text-2xl md:text-3xl font-semibold text-white mb-2 tracking-tight">
              Choose Your Atmosphere
            </h2>
            <p className="text-cyan-200/70 text-sm md:text-base">
              Select the aesthetic that makes you feel most at peace
            </p>
          </div>

          <WaveDivider className="mb-8" />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {themes.map((theme) => {
              const Icon = theme.icon;
              const isSelected = currentTheme === theme.id;

              return (
                <GlassCard
                  key={theme.id}
                  isActive={isSelected}
                  onClick={() => handleThemeSelection(theme.id)}
                  className={cn(
                    'group transition-all duration-500',
                    isSelected && 'ring-2 ring-cyan-400/50'
                  )}
                >
                  <div className="flex gap-2 mb-4">
                    {theme.colors.map((color, index) => (
                      <div
                        key={index}
                        className="h-10 w-10 rounded-full shadow-lg transition-transform group-hover:scale-110"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>

                  <div
                    className="h-14 w-14 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110"
                    style={{ backgroundColor: `${theme.colors[0]}25` }}
                  >
                    <Icon className="h-7 w-7" style={{ color: theme.colors[0] }} />
                  </div>

                  <h3 className="text-lg font-semibold text-white mb-2">{theme.name}</h3>
                  <p className="text-sm text-cyan-200/60 leading-relaxed">{theme.description}</p>

                  <div
                    className="mt-4 h-1.5 rounded-full"
                    style={{
                      background: `linear-gradient(90deg, ${theme.colors[0]}, ${theme.colors[1]}, ${theme.colors[2]})`,
                    }}
                  />
                </GlassCard>
              );
            })}
          </div>

          <div className="mt-8 text-center">
            <p className="text-cyan-200/50 text-sm">
              Next, choose the mentor archetype that fits your journey
            </p>
          </div>
        </GlassContainer>
      </div>
    );
  }

  if (currentStep === 'voice') {
    return (
      <div className="animate-step-enter">
        <GlassContainer size="xl" variant="ocean">
          <button
            onClick={goBack}
            className="flex items-center gap-2 text-cyan-300/70 hover:text-cyan-300 transition-colors mb-6 text-sm"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to themes
          </button>

          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-semibold text-white mb-2 tracking-tight">
              Choose Your Voice Companion
            </h2>
            <p className="text-cyan-200/70 text-sm md:text-base">
              Select a voice that feels most comforting to you. Preview each to hear their tone.
            </p>
          </div>

          <WaveDivider className="mb-8" />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {VOICE_OPTIONS.map((voice) => (
              <VoiceOptionCard
                key={voice.id}
                voice={voice}
                isSelected={voicePreference === voice.id}
                supportsSpeechSynthesis={supportsSpeechSynthesis}
                onPreview={() => previewVoiceOption(voice)}
                onPreviewUnavailable={() =>
                  setError(
                    'Voice preview is unavailable in this browser, but you can still continue.'
                  )
                }
                onSelect={() => handleVoiceSelection(voice.id)}
              />
            ))}
          </div>
        </GlassContainer>
      </div>
    );
  }

  if (currentStep === 'archetype') {
    return (
      <div className="animate-step-enter">
        <GlassContainer size="xl" variant="ocean">
          <button
            onClick={goBack}
            className="flex items-center gap-2 text-cyan-300/70 hover:text-cyan-300 transition-colors mb-6 text-sm"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to themes
          </button>
          <ArchetypeSelector
            selected={mentorProfile.archetype}
            onSelect={handleArchetypeSelection}
          />
        </GlassContainer>
      </div>
    );
  }

  if (currentStep === 'conversation') {
    return (
      <div className="animate-step-enter w-full max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={goBack}
            className="flex items-center gap-2 text-cyan-300/70 hover:text-cyan-300 transition-colors text-sm"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>

          <div className="text-center">
            <h2 className="text-lg font-semibold text-white">Your Safe Space</h2>
            <p className="text-xs text-cyan-200/50">For reflection & growth</p>
          </div>

          <div className="w-16" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 space-y-4">
            <GlassContainer size="full" variant="subtle">
              <ConversationMessages
                messages={messages}
                isSpeaking={isSpeaking}
                messagesEndRef={messagesEndRef}
              />

              <WaveDivider className="mb-6" />

              <div className="space-y-4">
                {sessionNotice ? (
                  <div className="rounded-xl border border-cyan-400/20 bg-cyan-500/8 px-4 py-3 text-sm text-cyan-100/90">
                    <div className="flex items-start justify-between gap-3">
                      <p>{sessionNotice}</p>
                      <button
                        type="button"
                        onClick={dismissSessionNotice}
                        aria-label="Dismiss context notice"
                        className="rounded-md p-1 text-cyan-100/70 hover:text-cyan-50 hover:bg-cyan-500/20 transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ) : null}

                {!supportsSpeechRecognition ? (
                  <div className="rounded-xl border border-cyan-400/20 bg-cyan-500/5 px-4 py-3 text-sm text-cyan-200/80">
                    Voice input is unavailable here. You can complete onboarding by typing your responses below.
                  </div>
                ) : null}

                <div className="flex flex-col items-center">
                  <button
                    onClick={isRecording ? stopRecording : startRecording}
                    disabled={isProcessing || !supportsSpeechRecognition}
                    className={cn(
                      'relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300',
                      isRecording
                        ? 'bg-red-500/80 shadow-lg shadow-red-500/40'
                        : isProcessing
                          ? 'bg-white/10'
                          : 'bg-gradient-to-br from-cyan-500 to-teal-500 hover:scale-105 shadow-lg shadow-cyan-500/30'
                    )}
                  >
                    {isProcessing ? (
                      <Loader2 className="h-8 w-8 text-cyan-300 animate-spin" />
                    ) : isRecording ? (
                      <Square className="h-8 w-8 text-white fill-white" />
                    ) : (
                      <Mic className="h-8 w-8 text-white" />
                    )}

                    {isRecording ? (
                      <>
                        <div className="absolute inset-0 rounded-full border-2 border-red-400/50 animate-ripple" />
                        <div
                          className="absolute inset-0 rounded-full border-2 border-red-400/30 animate-ripple"
                          style={{ animationDelay: '0.5s' }}
                        />
                      </>
                    ) : null}
                  </button>

                  <p className="text-cyan-200/60 text-sm mt-3">
                    {isRecording
                      ? 'Listening... Tap to stop'
                      : isProcessing
                        ? 'Thinking...'
                        : isSpeaking
                          ? 'Speaking... Tap mic to pause'
                          : supportsSpeechRecognition
                            ? 'Tap to share your thoughts'
                            : 'Type your thoughts below'}
                  </p>

                  {transcript ? <p className="text-xs text-cyan-200/40 mt-1">{transcript}</p> : null}

                  {isSpeaking ? (
                    <button
                      onClick={stopSpeaking}
                      className="mt-2 text-xs text-cyan-300/50 hover:text-cyan-300 flex items-center gap-1"
                    >
                      <Volume2 className="h-3 w-3" />
                      Stop speaking
                    </button>
                  ) : null}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={textInput}
                    onChange={(event) => setTextInput(event.target.value)}
                    onKeyDown={(event) => event.key === 'Enter' && sendTextMessage()}
                    placeholder="Or type your thoughts..."
                    className="flex-1 bg-white/5 border border-cyan-400/20 rounded-xl px-4 py-3 text-white placeholder:text-cyan-200/30 focus:outline-none focus:border-cyan-400/50 transition-colors"
                  />
                  <button
                    onClick={sendTextMessage}
                    disabled={!textInput.trim() || isProcessing}
                    className="px-4 py-3 bg-cyan-500/20 hover:bg-cyan-500/30 disabled:opacity-50 rounded-xl text-cyan-300 transition-colors"
                  >
                    <MessageSquare className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </GlassContainer>
          </div>

          <ProfilePreviewPanel
            extractedProfile={extractedProfile}
            isProcessing={isProcessing}
            onManualComplete={handleManualComplete}
          />
        </div>

        {error ? (
          <div className="mt-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        ) : null}
      </div>
    );
  }

  return null;
}
