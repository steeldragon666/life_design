'use client';

import { useState, useEffect } from 'react';
import { Volume2 } from 'lucide-react';
import { ARCHETYPE_CONFIGS, type MentorArchetype } from '@/lib/mentor-archetypes';
import { useElevenLabsTTS } from '@/hooks/useElevenLabsTTS';

export default function VoiceSettingsPanel() {
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [voiceSpeed, setVoiceSpeed] = useState(1.0);
  const { speak, isSpeaking, stop } = useElevenLabsTTS({ speed: voiceSpeed });

  useEffect(() => {
    setVoiceEnabled(localStorage.getItem('ld:voice-enabled') === 'true');
    setAutoSpeak(localStorage.getItem('ld:voice-auto-speak') !== 'false');
    const savedSpeed = localStorage.getItem('ld:voice-speed');
    if (savedSpeed) setVoiceSpeed(parseFloat(savedSpeed));
  }, []);

  function toggleVoice(val: boolean) {
    setVoiceEnabled(val);
    localStorage.setItem('ld:voice-enabled', String(val));
  }

  function toggleAutoSpeak(val: boolean) {
    setAutoSpeak(val);
    localStorage.setItem('ld:voice-auto-speak', String(val));
  }

  function updateSpeed(val: number) {
    setVoiceSpeed(val);
    localStorage.setItem('ld:voice-speed', String(val));
  }

  function preview(archetype: MentorArchetype) {
    const config = ARCHETYPE_CONFIGS.find(c => c.id === archetype);
    if (config) {
      if (isSpeaking) stop();
      else speak(config.greetingText, archetype);
    }
  }

  return (
    <div className="space-y-4">
      {/* Toggle: Speak mentor responses */}
      <label className="flex items-center justify-between">
        <span className="text-sm text-[#2A2623]">Speak mentor responses aloud</span>
        <input
          type="checkbox"
          checked={voiceEnabled}
          onChange={(e) => toggleVoice(e.target.checked)}
          className="h-4 w-4 accent-[#5A7F5A]"
        />
      </label>

      {/* Toggle: Auto-speak in voice conversations */}
      <label className="flex items-center justify-between">
        <span className="text-sm text-[#2A2623]">Auto-speak in voice conversations</span>
        <input
          type="checkbox"
          checked={autoSpeak}
          onChange={(e) => toggleAutoSpeak(e.target.checked)}
          className="h-4 w-4 accent-[#5A7F5A]"
        />
      </label>

      {/* Slider: Voice speed 0.75x - 1.25x */}
      <div>
        <label className="text-sm text-[#2A2623]">
          Voice speed: {voiceSpeed.toFixed(2)}x
        </label>
        <input
          type="range"
          min={0.75}
          max={1.25}
          step={0.05}
          value={voiceSpeed}
          onChange={(e) => updateSpeed(parseFloat(e.target.value))}
          className="w-full accent-[#5A7F5A]"
        />
      </div>

      {/* Preview cards for each mentor */}
      <div className="space-y-2 border-t border-[#E8E4DD] pt-4">
        <p className="text-xs font-medium text-[#A8A198] uppercase tracking-wide">Voice Previews</p>
        {ARCHETYPE_CONFIGS.map((config) => (
          <div
            key={config.id}
            className="flex items-center justify-between rounded-lg bg-[#F5F3EF] px-3 py-2 border border-[#E8E4DD]"
          >
            <span className="text-sm text-[#2A2623]">{config.characterName}</span>
            <button
              onClick={() => preview(config.id)}
              className="flex items-center gap-1 text-xs text-[#5A7F5A] hover:text-[#4a6f4a]"
              aria-label={`Preview ${config.characterName}'s voice`}
            >
              <Volume2 className="h-3.5 w-3.5" />
              {isSpeaking ? 'Stop' : 'Preview'}
            </button>
          </div>
        ))}
      </div>

      {/* Data usage note */}
      <p className="text-xs text-[#A8A198]">
        Voice responses use approximately 50–100KB per message via ElevenLabs.
      </p>
    </div>
  );
}
