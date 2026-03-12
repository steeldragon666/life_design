'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, Square, Loader2, Sparkles, User, MapPin, Briefcase, Heart, Target, Calendar, ArrowRight, CheckCircle2, Volume2, MessageSquare, Waves, Crown, Flower2, ChevronLeft, Play } from 'lucide-react';
import { useTheme } from '@/components/theme/theme-provider';
import { useGuest } from '@/lib/guest-context';
import { VOICE_OPTIONS, getSelectedVoice } from '@/components/voice/voice-selector';
import { useFlowState } from './flow-state';
import GlassContainer, { GlassCard, WaveDivider } from './glass-container';
import { cn } from '@/lib/utils';
import ArchetypeSelector from '@/components/mentor/archetype-selector';
import { getArchetypeConfig, getRecommendedVoiceForArchetype, type MentorArchetype } from '@/lib/mentor-archetypes';
import { buildMentorSystemPrompt } from '@/lib/mentor-orchestrator';

interface ExtractedProfile {
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

const WELCOME_MESSAGE = `Welcome to your Life Design journey. I'm here to create a calm, safe space where you can explore your thoughts, dreams, and aspirations without judgment.`;

export default function VoiceOnboardingAgent({
  onComplete,
  onSaveProfile,
  onCreateGoals,
}: VoiceOnboardingAgentProps) {
  const { theme: currentTheme, setTheme } = useTheme();
  const { voicePreference, setVoicePreference, mentorProfile, setMentorProfile } = useGuest();
  const { currentStep, setTheme: setFlowTheme, setArchetype: setFlowArchetype, setVoice: setFlowVoice, nextStep, goBack } = useFlowState();
  
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [extractedProfile, setExtractedProfile] = useState<ExtractedProfile>({});
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [textInput, setTextInput] = useState('');
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const synthesisRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load available voices
  useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      setAvailableVoices(voices);
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  // Initialize speech recognition
  useEffect(() => {
    const win = window as any;
    const SpeechRecognitionAPI = win.SpeechRecognition || win.webkitSpeechRecognition;
    
    if (SpeechRecognitionAPI) {
      const recognition = new SpeechRecognitionAPI();
      recognitionRef.current = recognition;
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        if (finalTranscript) {
          setCurrentTranscript((prev) => prev + finalTranscript);
        }
        if (interimTranscript) {
          setTranscript(interimTranscript);
        }
      };

      recognition.onerror = (event: any) => {
        if (event.error === 'not-allowed') {
          setError('Microphone access denied. Please allow microphone permissions.');
        } else if (event.error === 'no-speech') {
          setTranscript('No speech detected. Please try speaking again.');
        }
        setIsRecording(false);
      };

      recognition.onend = () => {
        if (currentTranscript && isRecording) {
          processUserMessage(currentTranscript);
        }
      };
    } else {
      setError('Speech recognition not supported. Please use Chrome or Edge browser.');
    }

    return () => {
      recognitionRef.current?.stop();
      if (synthesisRef.current) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const getVoiceForSpeaking = (): SpeechSynthesisVoice | null => {
    return getSelectedVoice(voicePreference, availableVoices);
  };

  const speakMessage = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    synthesisRef.current = utterance;
    
    const voice = getVoiceForSpeaking();
    if (voice) {
      utterance.voice = voice;
    }
    
    utterance.rate = 0.88;
    utterance.pitch = voicePreference === 'warm-american-male' ? 0.92 : 1.02;
    utterance.volume = 0.85;
    
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  const handleThemeSelection = (themeId: 'botanical' | 'ocean' | 'modern') => {
    setTheme(themeId);
    setFlowTheme(themeId);
    
    const themeResponses: Record<string, string> = {
      botanical: `Beautiful choice. The Ethereal Botanical theme brings soft, organic warmth to your space—like a quiet garden where your thoughts can bloom freely.`,
      ocean: `Wonderful. The Ocean Zen theme surrounds you with calming teals and the gentle rhythm of water—a space for clarity and flow.`,
      modern: `Excellent. The Dark Modern theme offers sophisticated simplicity—a focused, distraction-free space for deep reflection.`,
    };

    const response = themeResponses[themeId];
    setMessages([
      { role: 'assistant', content: WELCOME_MESSAGE },
      { role: 'user', content: `I'd like the ${themes.find(t => t.id === themeId)?.name} theme` },
      { role: 'assistant', content: response },
    ]);
    
    nextStep();
  };

  const handleVoiceSelection = (voiceId: string) => {
    setVoicePreference(voiceId);
    setFlowVoice(voiceId);
    setMentorProfile({ voiceId });
    
    const voice = VOICE_OPTIONS.find(v => v.id === voiceId);
    const voiceResponses: Record<string, string> = {
      'calm-british-female': `Lovely to meet you. I'm Eleanor, and I'm here to walk alongside you as you explore your life design. There's no rush—we'll take this one gentle step at a time.\n\nTo begin, may I ask your name?`,
      'warm-american-male': `Hey there. I'm Theo, and I'm honored to be part of your journey. This is your space to reflect, dream, and grow. I'm here to listen and support you.\n\nLet's start simple—what's your name?`,
      'soft-australian-female': `Hello, lovely to meet you. I'm Maya, and I'm so glad you're here. This is your time to breathe, reflect, and envision the life you want.\n\nTo get started, what name do you go by?`,
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

  const startRecording = async () => {
    if (!recognitionRef.current) {
      setError('Speech recognition not available. Please use Chrome or Edge.');
      return;
    }

    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      setCurrentTranscript('');
      setTranscript('Listening...');
      setIsRecording(true);
      setError(null);
      recognitionRef.current.start();
    } catch (err) {
      setError('Microphone access denied. Please allow microphone permissions.');
    }
  };

  const stopRecording = () => {
    if (!recognitionRef.current) return;
    recognitionRef.current.stop();
    setIsRecording(false);
    setTranscript('Processing...');
    
    if (currentTranscript) {
      processUserMessage(currentTranscript);
    } else {
      setTranscript('No speech detected. Please try again.');
      setTimeout(() => setTranscript(''), 3000);
    }
  };

  const processUserMessage = async (userMessage: string) => {
    if (!userMessage.trim()) return;

    setIsProcessing(true);
    setTranscript('');
    setCurrentTranscript('');

    try {
      setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);

      const conversationContext = messages.map(m => ({
        role: m.role,
        content: m.content,
      }));

      const voiceName = mentorProfile.characterName || 'your guide';
      const systemPrompt = buildMentorSystemPrompt(mentorProfile, 'onboarding');

      const fullPrompt = `${systemPrompt}\n\nConversation:\n${JSON.stringify(conversationContext)}\n\nUser: "${userMessage}"\n\nRespond warmly and naturally, as ${voiceName}:`;

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: fullPrompt }),
      });

      if (!response.ok) throw new Error('Failed to get AI response');

      const data = await response.json();
      const aiResponse = data.text || "I'm here with you. Tell me more when you're ready.";

      setMessages((prev) => [...prev, { role: 'assistant', content: aiResponse }]);
      
      speakMessage(aiResponse);

      await extractAndUpdateProfile([...conversationContext, { role: 'user', content: userMessage }, { role: 'assistant', content: aiResponse }]);

    } catch (err) {
      setMessages((prev) => [...prev, { 
        role: 'assistant', 
        content: 'Take your time. I am here whenever you are ready to continue.' 
      }]);
    } finally {
      setIsProcessing(false);
    }
  };

  const extractAndUpdateProfile = async (conversation: any[]) => {
    try {
      const extractPrompt = `Extract profile data from this conversation. Return JSON with: name, location, profession, interests (array), hobbies (array), maritalStatus, goals (array with title, horizon, description). Only include what was explicitly shared.`;

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: `${extractPrompt}\n\nConversation: ${JSON.stringify(conversation)}` 
        }),
      });

      if (!response.ok) return;

      const data = await response.json();
      const extractedText = data.text || '{}';

      try {
        const jsonMatch = extractedText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const extracted = JSON.parse(jsonMatch[0]);
          setExtractedProfile((prev) => ({
            ...prev,
            ...extracted,
            interests: [...new Set([...(prev.interests || []), ...(extracted.interests || [])])],
            hobbies: [...new Set([...(prev.hobbies || []), ...(extracted.hobbies || [])])],
            goals: extracted.goals?.length ? [...(prev.goals || []), ...extracted.goals] : prev.goals,
          }));
        }
      } catch (parseErr) {
        console.error('Failed to parse extraction:', parseErr);
      }
    } catch (err) {
      console.error('Extraction error:', err);
    }
  };

  const stopSpeaking = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  const handleManualComplete = async () => {
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
    } catch (err) {
      setError('Failed to save. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const sendTextMessage = () => {
    if (!textInput.trim()) return;
    processUserMessage(textInput);
    setTextInput('');
  };

  // Voice wave visualization component
  const VoiceWave = ({ isActive }: { isActive: boolean }) => (
    <div className="flex items-center gap-[3px] h-6">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className={cn(
            'w-[3px] rounded-sm transition-all duration-300',
            isActive 
              ? 'bg-gradient-to-t from-cyan-400 to-teal-300' 
              : 'bg-white/20'
          )}
          style={{
            height: isActive ? `${[8, 16, 12, 20, 10][i-1]}px` : '4px',
            animationDelay: `${(i - 1) * 0.1}s`,
            animation: isActive ? `voiceWave 1s ease-in-out infinite ${(i - 1) * 0.1}s` : 'none',
          }}
        />
      ))}
    </div>
  );

  // Theme Selection Step
  if (currentStep === 'theme') {
    return (
      <div className="animate-step-enter">
        <GlassContainer size="xl" variant="ocean">
          {/* Header */}
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

          {/* Theme Cards */}
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
                  {/* Color preview */}
                  <div className="flex gap-2 mb-4">
                    {theme.colors.map((color, i) => (
                      <div
                        key={i}
                        className="h-10 w-10 rounded-full shadow-lg transition-transform group-hover:scale-110"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>

                  {/* Icon */}
                  <div 
                    className="h-14 w-14 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110"
                    style={{ backgroundColor: `${theme.colors[0]}25` }}
                  >
                    <Icon className="h-7 w-7" style={{ color: theme.colors[0] }} />
                  </div>

                  <h3 className="text-lg font-semibold text-white mb-2">{theme.name}</h3>
                  <p className="text-sm text-cyan-200/60 leading-relaxed">{theme.description}</p>

                  {/* Selection indicator */}
                  <div 
                    className="mt-4 h-1.5 rounded-full"
                    style={{ 
                      background: `linear-gradient(90deg, ${theme.colors[0]}, ${theme.colors[1]}, ${theme.colors[2]})` 
                    }}
                  />
                </GlassCard>
              );
            })}
          </div>

          {/* Voice option hint */}
          <div className="mt-8 text-center">
            <p className="text-cyan-200/50 text-sm">
              Next, choose the mentor archetype that fits your journey
            </p>
          </div>
        </GlassContainer>
      </div>
    );
  }

  // Voice Selection Step
  if (currentStep === 'voice') {
    return (
      <div className="animate-step-enter">
        <GlassContainer size="xl" variant="ocean">
          {/* Back button */}
          <button
            onClick={goBack}
            className="flex items-center gap-2 text-cyan-300/70 hover:text-cyan-300 transition-colors mb-6 text-sm"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to themes
          </button>

          {/* Header */}
          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-semibold text-white mb-2 tracking-tight">
              Choose Your Voice Companion
            </h2>
            <p className="text-cyan-200/70 text-sm md:text-base">
              Select a voice that feels most comforting to you. Preview each to hear their tone.
            </p>
          </div>

          <WaveDivider className="mb-8" />

          {/* Voice Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {VOICE_OPTIONS.map((voice) => {
              const isSelected = voicePreference === voice.id;
              
              return (
                <GlassCard
                  key={voice.id}
                  isActive={isSelected}
                  className={cn(
                    'relative p-6 transition-all duration-500',
                    isSelected && 'ring-2 ring-cyan-400/50'
                  )}
                >
                  {/* Selection indicator */}
                  {isSelected && (
                    <div className="absolute top-4 right-4">
                      <div className="h-6 w-6 rounded-full bg-cyan-400 flex items-center justify-center">
                        <CheckCircle2 className="h-4 w-4 text-white" />
                      </div>
                    </div>
                  )}

                  {/* Avatar */}
                  <div className={cn(
                    'h-16 w-16 rounded-full flex items-center justify-center mb-4',
                    voice.gender === 'female' 
                      ? 'bg-gradient-to-br from-pink-400/20 to-purple-400/20' 
                      : 'bg-gradient-to-br from-cyan-400/20 to-teal-400/20'
                  )}>
                    <User className={cn(
                      'h-8 w-8',
                      voice.gender === 'female' ? 'text-pink-300' : 'text-cyan-300'
                    )} />
                  </div>

                  {/* Info */}
                  <h3 className="text-lg font-semibold text-white mb-1">{voice.name}</h3>
                  <p className="text-xs text-cyan-200/50 mb-1 uppercase tracking-wider">
                    {voice.accent} • {voice.gender}
                  </p>
                  <p className="text-sm text-cyan-200/70 leading-relaxed mb-4">
                    {voice.description}
                  </p>

                  {/* Preview & Select buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        // Preview voice
                        const utterance = new SpeechSynthesisUtterance(voice.previewText);
                        const voices = window.speechSynthesis.getVoices();
                        const voiceMap: Record<string, string[]> = {
                          'calm-british-female': ['Google UK English Female', 'Samantha', 'Victoria'],
                          'warm-american-male': ['Google US English Male', 'Daniel', 'Alex'],
                          'soft-australian-female': ['Karen', 'Google UK English Female'],
                        };
                        const pref = voiceMap[voice.id];
                        const match = voices.find(v => pref?.some(p => v.name.includes(p) || v.lang.includes(p)));
                        if (match) utterance.voice = match;
                        utterance.rate = 0.88;
                        utterance.pitch = voice.gender === 'female' ? 1.02 : 0.92;
                        window.speechSynthesis.speak(utterance);
                      }}
                      className="flex-1 py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-cyan-200/80 text-sm font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      <Play className="w-4 h-4" />
                      Preview
                    </button>
                    <button
                      onClick={() => handleVoiceSelection(voice.id)}
                      className={cn(
                        'flex-1 py-2.5 px-3 rounded-xl text-sm font-medium transition-colors',
                        isSelected
                          ? 'bg-cyan-400/20 text-cyan-300'
                          : 'bg-cyan-500 hover:bg-cyan-400 text-white'
                      )}
                    >
                      {isSelected ? 'Selected' : 'Choose'}
                    </button>
                  </div>
                </GlassCard>
              );
            })}
          </div>
        </GlassContainer>
      </div>
    );
  }

  // Archetype Selection Step
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

  // Conversation Step
  if (currentStep === 'conversation') {
    return (
      <div className="animate-step-enter w-full max-w-6xl mx-auto">
        {/* Header with step indicators */}
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

          <div className="w-16" /> {/* Spacer for alignment */}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Main Chat Area */}
          <div className="lg:col-span-3 space-y-4">
            <GlassContainer size="full" variant="subtle">
              {/* Messages */}
              <div className="h-[400px] overflow-y-auto space-y-4 mb-6 scrollbar-thin">
                {messages.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-cyan-200/40">
                    <div className="text-center">
                      <VoiceWave isActive={isSpeaking} />
                      <p className="mt-2">Your conversation will begin here...</p>
                    </div>
                  </div>
                ) : (
                  messages.map((message, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        'flex',
                        message.role === 'user' ? 'justify-end' : 'justify-start'
                      )}
                    >
                      <div
                        className={cn(
                          'max-w-[85%] rounded-2xl px-5 py-4',
                          message.role === 'user'
                            ? 'bg-gradient-to-br from-cyan-600 to-teal-600 text-white'
                            : 'bg-white/5 text-cyan-50 border border-cyan-400/10'
                        )}
                      >
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                        
                        {/* Voice indicator for assistant messages */}
                        {message.role === 'assistant' && isSpeaking && idx === messages.length - 1 && (
                          <div className="mt-2">
                            <VoiceWave isActive={true} />
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              <WaveDivider className="mb-6" />

              {/* Input Controls */}
              <div className="space-y-4">
                {/* Voice recording button */}
                <div className="flex flex-col items-center">
                  <button
                    onClick={isRecording ? stopRecording : startRecording}
                    disabled={isProcessing}
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
                    
                    {/* Ripple effect when recording */}
                    {isRecording && (
                      <>
                        <div className="absolute inset-0 rounded-full border-2 border-red-400/50 animate-ripple" />
                        <div className="absolute inset-0 rounded-full border-2 border-red-400/30 animate-ripple" style={{ animationDelay: '0.5s' }} />
                      </>
                    )}
                  </button>

                  <p className="text-cyan-200/60 text-sm mt-3">
                    {isRecording ? 'Listening... Tap to stop' : 
                     isProcessing ? 'Thinking...' : 
                     isSpeaking ? 'Speaking... Tap mic to pause' : 
                     'Tap to share your thoughts'}
                  </p>
                  
                  {transcript && (
                    <p className="text-xs text-cyan-200/40 mt-1">{transcript}</p>
                  )}

                  {isSpeaking && (
                    <button 
                      onClick={stopSpeaking} 
                      className="mt-2 text-xs text-cyan-300/50 hover:text-cyan-300 flex items-center gap-1"
                    >
                      <Volume2 className="h-3 w-3" />
                      Stop speaking
                    </button>
                  )}
                </div>

                {/* Text input fallback */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendTextMessage()}
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

          {/* Profile Preview Side Panel */}
          <div className="lg:col-span-2 space-y-4">
            <GlassContainer size="full" variant="subtle">
              <div className="flex items-center gap-2 mb-4">
                <User className="h-5 w-5 text-cyan-400" />
                <h3 className="text-lg font-semibold text-white">Your Story</h3>
              </div>

              <div className="space-y-3 text-sm">
                {extractedProfile.name ? (
                  <div className="flex items-center gap-2 text-cyan-100">
                    <User className="h-4 w-4 text-cyan-400/50" />
                    <span>{extractedProfile.name}</span>
                    <CheckCircle2 className="h-3 w-3 text-teal-400" />
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-cyan-200/30">
                    <User className="h-4 w-4" />
                    <span className="italic">Your name...</span>
                  </div>
                )}

                {extractedProfile.location && (
                  <div className="flex items-center gap-2 text-cyan-100">
                    <MapPin className="h-4 w-4 text-cyan-400/50" />
                    <span>{extractedProfile.location}</span>
                  </div>
                )}

                {extractedProfile.profession && (
                  <div className="flex items-center gap-2 text-cyan-100">
                    <Briefcase className="h-4 w-4 text-cyan-400/50" />
                    <span>{extractedProfile.profession}</span>
                  </div>
                )}

                {extractedProfile.interests && extractedProfile.interests.length > 0 && (
                  <div className="flex items-start gap-2 text-cyan-100">
                    <Heart className="h-4 w-4 text-cyan-400/50 mt-0.5" />
                    <span>{extractedProfile.interests.join(', ')}</span>
                  </div>
                )}

                {extractedProfile.goals && extractedProfile.goals.length > 0 && (
                  <div className="flex items-start gap-2 text-cyan-100">
                    <Target className="h-4 w-4 text-cyan-400/50 mt-0.5" />
                    <span>{extractedProfile.goals.length} goal(s) captured</span>
                  </div>
                )}
              </div>

              {Object.keys(extractedProfile).length === 0 && (
                <p className="text-cyan-200/30 text-sm italic mt-4">
                  As we talk, I&apos;ll gently capture the essence of your story...
                </p>
              )}
            </GlassContainer>

            {/* Goals preview */}
            {extractedProfile.goals && extractedProfile.goals.length > 0 && (
              <GlassContainer size="full" variant="subtle">
                <div className="flex items-center gap-2 mb-4">
                  <Calendar className="h-5 w-5 text-cyan-400" />
                  <h3 className="text-lg font-semibold text-white">Your Goals</h3>
                </div>
                <div className="space-y-2">
                  {extractedProfile.goals.map((goal, idx) => (
                    <div 
                      key={idx} 
                      className="p-3 rounded-xl bg-white/5 border border-cyan-400/10"
                    >
                      <span className="text-sm text-cyan-100">{goal.title}</span>
                      <span className="text-xs text-cyan-300/50 ml-2 capitalize">({goal.horizon})</span>
                    </div>
                  ))}
                </div>
              </GlassContainer>
            )}

            {/* Complete button */}
            {extractedProfile.name && (
              <button
                onClick={handleManualComplete}
                disabled={isProcessing}
                className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 text-white font-semibold shadow-lg shadow-cyan-500/25 hover:shadow-xl hover:shadow-cyan-500/30 hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="h-5 w-5" />
                Begin My Journey
                <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="mt-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}
      </div>
    );
  }

  return null;
}
