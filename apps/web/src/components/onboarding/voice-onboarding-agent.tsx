'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ChatCircle,
  Crown,
  FlowerLotus,
  GoogleLogo,
  Microphone,
  Spinner as PhosphorSpinner,
  Square,
  SpeakerHigh,
  Sparkle,
  Waves,
  X,
} from '@phosphor-icons/react';
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
import { Button, Input } from '@life-design/ui';
import { cn } from '@/lib/utils';

interface VoiceOnboardingAgentProps {
  onComplete: (profile: ExtractedProfile) => void;
  onSaveProfile: (data: any) => Promise<{ error: string | null }>;
  onCreateGoals: (goals: any[]) => Promise<{ error: string | null }>;
}

const themes = [
  {
    id: 'botanical' as const,
    name: 'Ethereal Botanical',
    description: 'Soft pinks, gentle purples, and organic warmth',
    icon: FlowerLotus,
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
    goToStep,
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

  // ── Theme step ─────────────────────────────────────────────────────────────
  if (currentStep === 'theme') {
    return (
      <div className="animate-step-enter">
        <GlassContainer className="max-w-2xl">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-sage-50 mb-4">
              <Sparkle className="w-7 h-7 text-sage-600" weight="fill" />
            </div>
            <h2 className="text-2xl font-serif text-stone-800 mb-2">Choose Your Atmosphere</h2>
            <p className="text-stone-500 text-sm">
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
                  className="group transition-all duration-300"
                >
                  <div className="flex gap-2 mb-4">
                    {theme.colors.map((color, index) => (
                      <div
                        key={index}
                        className="h-8 w-8 rounded-full shadow-sm transition-transform group-hover:scale-110"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>

                  <div
                    className="h-12 w-12 rounded-xl flex items-center justify-center mb-3 transition-transform group-hover:scale-110"
                    style={{ backgroundColor: `${theme.colors[0]}25` }}
                  >
                    <Icon className="h-6 w-6" style={{ color: theme.colors[0] }} weight="fill" />
                  </div>

                  <h3 className="text-base font-semibold text-stone-800 mb-1">{theme.name}</h3>
                  <p className="text-sm text-stone-500 leading-relaxed">{theme.description}</p>

                  <div
                    className="mt-4 h-1 rounded-full"
                    style={{
                      background: `linear-gradient(90deg, ${theme.colors[0]}, ${theme.colors[1]}, ${theme.colors[2]})`,
                    }}
                  />
                </GlassCard>
              );
            })}
          </div>

          <div className="mt-8 text-center">
            <p className="text-stone-400 text-sm">
              Next, choose the mentor archetype that fits your journey
            </p>
          </div>
        </GlassContainer>
      </div>
    );
  }

  // ── Voice step ─────────────────────────────────────────────────────────────
  if (currentStep === 'voice') {
    return (
      <div className="animate-step-enter">
        <GlassContainer className="max-w-2xl">
          <button
            onClick={goBack}
            className="flex items-center gap-1.5 text-stone-500 hover:text-stone-800 transition-colors mb-6 text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to themes
          </button>

          <div className="text-center mb-8">
            <h2 className="text-2xl font-serif text-stone-800 mb-2">Choose Your Voice Companion</h2>
            <p className="text-stone-500 text-sm">
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
                    'Voice preview is unavailable in this browser, but you can still continue.',
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

  // ── Archetype step ─────────────────────────────────────────────────────────
  if (currentStep === 'archetype') {
    return (
      <div className="animate-step-enter">
        <GlassContainer className="max-w-2xl">
          <button
            onClick={goBack}
            className="flex items-center gap-1.5 text-stone-500 hover:text-stone-800 transition-colors mb-6 text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
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

  // ── Conversation step ──────────────────────────────────────────────────────
  if (currentStep === 'conversation') {
    return (
      <div className="animate-step-enter w-full max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={goBack}
            className="flex items-center gap-1.5 text-stone-500 hover:text-stone-800 transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>

          <div className="text-center">
            <h2 className="text-base font-semibold text-stone-800">Your Safe Space</h2>
            <p className="text-xs text-stone-400">For reflection &amp; growth</p>
          </div>

          <div className="w-16" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 space-y-4">
            <div className="bg-white rounded-[20px] shadow-[0_4px_12px_rgba(0,0,0,0.06)] p-8">
              <ConversationMessages
                messages={messages}
                isSpeaking={isSpeaking}
                messagesEndRef={messagesEndRef}
              />

              <WaveDivider className="mb-6" />

              <div className="space-y-4">
                {sessionNotice ? (
                  <div className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-700">
                    <div className="flex items-start justify-between gap-3">
                      <p>{sessionNotice}</p>
                      <button
                        type="button"
                        onClick={dismissSessionNotice}
                        aria-label="Dismiss context notice"
                        className="rounded-md p-1 text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ) : null}

                {!supportsSpeechRecognition ? (
                  <div className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-500">
                    Voice input is unavailable here. You can complete onboarding by typing your
                    responses below.
                  </div>
                ) : null}

                <div className="flex flex-col items-center">
                  <button
                    onClick={isRecording ? stopRecording : startRecording}
                    disabled={isProcessing || !supportsSpeechRecognition}
                    className={cn(
                      'relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300',
                      isRecording
                        ? 'bg-red-500 shadow-lg shadow-red-500/30'
                        : isProcessing
                          ? 'bg-stone-100'
                          : 'bg-sage-600 hover:bg-sage-600/90 hover:scale-105 shadow-lg shadow-sage-600/30',
                    )}
                  >
                    {isProcessing ? (
                      <PhosphorSpinner className="h-8 w-8 text-stone-400 animate-spin" />
                    ) : isRecording ? (
                      <Square className="h-8 w-8 text-white" weight="fill" />
                    ) : (
                      <Microphone className="h-8 w-8 text-white" weight="fill" />
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

                  <p className="text-stone-400 text-sm mt-3">
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

                  {transcript ? (
                    <p className="text-xs text-stone-400 mt-1">{transcript}</p>
                  ) : null}

                  {isSpeaking ? (
                    <button
                      onClick={stopSpeaking}
                      className="mt-2 text-xs text-stone-400 hover:text-stone-600 flex items-center gap-1 transition-colors"
                    >
                      <SpeakerHigh className="h-3 w-3" />
                      Stop speaking
                    </button>
                  ) : null}
                </div>

                <div className="flex gap-2">
                  <Input
                    value={textInput}
                    onChange={(event) => setTextInput(event.target.value)}
                    onKeyDown={(event) => event.key === 'Enter' && sendTextMessage()}
                    placeholder="Or type your thoughts..."
                  />
                  <Button
                    onClick={sendTextMessage}
                    disabled={!textInput.trim() || isProcessing}
                    variant="secondary"
                    className="flex-shrink-0"
                  >
                    <ChatCircle className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <ProfilePreviewPanel
            extractedProfile={extractedProfile}
            isProcessing={isProcessing}
            onManualComplete={handleManualComplete}
          />
        </div>

        {error ? (
          <div className="mt-4 p-4 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">
            {error}
          </div>
        ) : null}
      </div>
    );
  }

  // ── Calendar Connect step ──────────────────────────────────────────────────
  if (currentStep === 'calendar_connect') {
    return (
      <div className="animate-step-enter">
        <div className="max-w-lg mx-auto bg-white rounded-[20px] shadow-[0_4px_12px_rgba(0,0,0,0.06)] p-8 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-sage-50 mb-5">
            {/* Calendar icon via inline SVG — phosphor CalendarBlank */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 256 256"
              className="w-7 h-7 text-sage-600"
              fill="currentColor"
            >
              <path d="M208,32H184V24a8,8,0,0,0-16,0v8H88V24a8,8,0,0,0-16,0v8H48A16,16,0,0,0,32,48V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V48A16,16,0,0,0,208,32ZM48,48H72v8a8,8,0,0,0,16,0V48h80v8a8,8,0,0,0,16,0V48h24V80H48Zm160,160H48V96H208V208Z" />
            </svg>
          </div>

          <h2 className="text-2xl font-serif text-stone-800 mb-2">Connect Your Calendar</h2>
          <p className="text-stone-500 text-sm mb-8 max-w-sm mx-auto">
            Sync your schedule so Life Design can help you carve out time for the things that matter
            most. You can always connect later from settings.
          </p>

          <div className="space-y-3 mb-6">
            <Button
              variant="primary"
              size="lg"
              className="w-full justify-center gap-2"
              onClick={() => {
                // UI only — OAuth integration not wired up
                goToStep('complete');
              }}
            >
              <GoogleLogo className="h-4 w-4" weight="bold" />
              Connect Google Calendar
            </Button>

            <Button
              variant="secondary"
              size="lg"
              className="w-full justify-center gap-2"
              onClick={() => {
                // UI only — Apple Calendar deep link not wired up
                goToStep('complete');
              }}
            >
              {/* Apple logo — inline SVG */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 814 1000"
                className="h-4 w-4"
                fill="currentColor"
              >
                <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-37.5-157.2-117.5c-44.5-71.3-89.8-182.4-89.8-288.9 0-166.5 108.4-255.5 215.1-255.5 81.3 0 150 53.5 202 53.5 50 0 127.5-56.7 216.9-56.7 11.6 0 81.5.6 141.1 61.9zm-181.2-117.3c28.1-35.1 48.4-83.6 48.4-132.1 0-6.4-.6-12.8-1.9-18.6-45.5 1.9-99.7 30.2-132 67.1-26.9 30.2-52.2 78.7-52.2 127.8 0 7.1 1.3 14.1 1.9 16.4 3.2.6 8.4 1.3 13.5 1.3 40.7 0 91.1-27.2 122.3-61.9z" />
              </svg>
              Connect Apple Calendar
            </Button>
          </div>

          <Button
            variant="ghost"
            size="default"
            onClick={() => goToStep('complete')}
          >
            Skip for now
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
