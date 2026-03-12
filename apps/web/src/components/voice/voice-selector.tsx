'use client';

import { useState, useEffect } from 'react';
import { Volume2, Check, Mic, User, Globe } from 'lucide-react';

interface VoiceOption {
  id: string;
  name: string;
  gender: 'male' | 'female';
  accent: string;
  description: string;
  voiceURI?: string;
  previewText: string;
}

const VOICE_OPTIONS: VoiceOption[] = [
  {
    id: 'calm-british-female',
    name: 'Eleanor',
    gender: 'female',
    accent: 'British',
    description: 'Warm, soothing British voice with a gentle, nurturing tone',
    previewText: "Hello, I'm Eleanor. I'll be your gentle guide on this journey of self-discovery. Take a deep breath, and let's begin.",
  },
  {
    id: 'warm-american-male',
    name: 'Theo',
    gender: 'male',
    accent: 'American',
    description: 'Deep, calming voice with a reassuring, grounding presence',
    previewText: "Hi, I'm Theo. I'm here to create a safe space for you to explore your thoughts and aspirations. There's no rush, no pressure—just us having a calm conversation.",
  },
  {
    id: 'soft-australian-female',
    name: 'Maya',
    gender: 'female',
    accent: 'Australian',
    description: 'Soft, melodic voice with an easygoing, comforting quality',
    previewText: "G'day, I'm Maya. I'm so glad you're here. This is your time, your space. Let's chat about what matters most to you, at whatever pace feels right.",
  },
];

interface VoiceSelectorProps {
  selectedVoice: string;
  onSelect: (voiceId: string) => void;
  showPreview?: boolean;
}

export default function VoiceSelector({ selectedVoice, onSelect, showPreview = true }: VoiceSelectorProps) {
  const [isSpeaking, setIsSpeaking] = useState<string | null>(null);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    // Load available voices
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

  const findBestVoice = (option: VoiceOption): SpeechSynthesisVoice | null => {
    if (availableVoices.length === 0) return null;

    // Mapping of our voice options to system voice preferences
    const voiceMappings: Record<string, string[]> = {
      'calm-british-female': ['Google UK English Female', 'Samantha', 'Victoria', 'Kate', 'en-GB'],
      'warm-american-male': ['Google US English Male', 'Daniel', 'Alex', 'Tom', 'en-US'],
      'soft-australian-female': ['Karen', 'en-AU', 'Google UK English Female'],
    };

    const preferences = voiceMappings[option.id] || [];
    
    // Try to find a matching voice
    for (const pref of preferences) {
      const match = availableVoices.find(v => 
        v.name.includes(pref) || v.lang.includes(pref)
      );
      if (match) return match;
    }

    // Fallback to any English voice of preferred gender
    const genderPreference = option.gender === 'female' ? 'Female' : 'Male';
    const fallback = availableVoices.find(v => 
      v.lang.startsWith('en') && v.name.includes(genderPreference)
    );

    return fallback || availableVoices[0];
  };

  const previewVoice = (option: VoiceOption) => {
    if (!('speechSynthesis' in window)) return;

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(option.previewText);
    const voice = findBestVoice(option);
    
    if (voice) {
      utterance.voice = voice;
    }

    // Adjust parameters for more natural, soothing speech
    utterance.rate = 0.88; // Slightly slower for calmness
    utterance.pitch = option.gender === 'female' ? 1.05 : 0.95; // Natural pitch
    utterance.volume = 0.9;

    utterance.onstart = () => setIsSpeaking(option.id);
    utterance.onend = () => setIsSpeaking(null);
    utterance.onerror = () => setIsSpeaking(null);

    window.speechSynthesis.speak(utterance);
  };

  const stopPreview = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(null);
  };

  return (
    <div className="w-full space-y-4">
      <div className="text-center mb-6">
        <h3 className="text-xl font-semibold text-white mb-2">Choose Your Companion</h3>
        <p className="text-slate-400 text-sm">
          Select a voice that feels most comforting to you
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {VOICE_OPTIONS.map((option) => {
          const isSelected = selectedVoice === option.id;
          const isPlaying = isSpeaking === option.id;

          return (
            <button
              key={option.id}
              onClick={() => onSelect(option.id)}
              className={`relative p-5 rounded-2xl border-2 transition-all text-left group ${
                isSelected
                  ? 'border-teal-500 bg-teal-500/10'
                  : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/20'
              }`}
            >
              {/* Selected Indicator */}
              {isSelected && (
                <div className="absolute top-4 right-4 h-6 w-6 rounded-full bg-teal-500 flex items-center justify-center">
                  <Check className="h-4 w-4 text-white" />
                </div>
              )}

              {/* Voice Avatar */}
              <div className="flex items-center gap-3 mb-4">
                <div className={`h-12 w-12 rounded-full flex items-center justify-center ${
                  option.gender === 'female' 
                    ? 'bg-gradient-to-br from-pink-400/30 to-purple-400/30' 
                    : 'bg-gradient-to-br from-blue-400/30 to-teal-400/30'
                }`}>
                  <User className={`h-6 w-6 ${
                    option.gender === 'female' ? 'text-pink-300' : 'text-blue-300'
                  }`} />
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-white">{option.name}</h4>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="capitalize">{option.gender}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Globe className="h-3 w-3" />
                      {option.accent}
                    </span>
                  </div>
                </div>
              </div>

              {/* Description */}
              <p className="text-sm text-slate-400 leading-relaxed mb-4">
                {option.description}
              </p>

              {/* Preview Button */}
              {showPreview && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isPlaying) {
                      stopPreview();
                    } else {
                      previewVoice(option);
                    }
                  }}
                  className={`w-full py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 text-sm font-medium transition-all ${
                    isPlaying
                      ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                      : 'bg-white/5 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  {isPlaying ? (
                    <>
                      <Volume2 className="h-4 w-4 animate-pulse" />
                      Stop Preview
                    </>
                  ) : (
                    <>
                      <Mic className="h-4 w-4" />
                      Hear Sample
                    </>
                  )}
                </button>
              )}

              {/* Selected Visual Indicator */}
              {isSelected && (
                <div className="mt-4 pt-4 border-t border-teal-500/20">
                  <p className="text-xs text-teal-400 text-center">
                    Selected as your companion
                  </p>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Voice Info */}
      <div className="p-4 rounded-xl bg-white/5 border border-white/5 text-center">
        <p className="text-sm text-slate-500">
          You can change your voice companion anytime in Settings
        </p>
      </div>
    </div>
  );
}

// Helper to get voice for speaking
export function getSelectedVoice(voiceId: string, availableVoices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  const voiceMappings: Record<string, string[]> = {
    'calm-british-female': ['Google UK English Female', 'Samantha', 'Victoria', 'Kate', 'en-GB'],
    'warm-american-male': ['Google US English Male', 'Daniel', 'Alex', 'Tom', 'en-US'],
    'soft-australian-female': ['Karen', 'en-AU', 'Google UK English Female'],
  };

  const preferences = voiceMappings[voiceId] || voiceMappings['calm-british-female'];
  
  for (const pref of preferences) {
    const match = availableVoices.find(v => 
      v.name.includes(pref) || v.lang.includes(pref)
    );
    if (match) return match;
  }

  return availableVoices[0] || null;
}

// Export voice options for use in other components
export { VOICE_OPTIONS };
