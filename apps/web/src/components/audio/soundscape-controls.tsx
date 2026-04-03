'use client';

import { Sliders, Waves } from '@phosphor-icons/react';
import { useGuest } from '@/lib/guest-context';

const HUM_PRESETS = [100, 136.1, 432, 528];

export default function SoundscapeControls() {
  const { soundscape, setSoundscape } = useGuest();

  return (
    <div className="glass-card p-6 space-y-5">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-cyan-500/20 flex items-center justify-center">
          <Waves size={20} className="text-cyan-300" />
        </div>
        <div>
          <h3 className="text-white font-semibold">Meditation Soundscape</h3>
          <p className="text-xs text-stone-400">Low-volume ambient hum for calm focus</p>
        </div>
      </div>

      <label className="flex items-center justify-between text-sm text-stone-300">
        <span>Enable background sound</span>
        <input
          type="checkbox"
          checked={soundscape.enabled}
          onChange={(e) => setSoundscape({ enabled: e.target.checked })}
        />
      </label>

      <label className="flex items-center justify-between text-sm text-stone-300">
        <span>Enable hum layer</span>
        <input
          type="checkbox"
          checked={soundscape.humEnabled}
          onChange={(e) => setSoundscape({ humEnabled: e.target.checked })}
        />
      </label>

      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs text-stone-400">
          <Sliders size={14} />
          Volume ({Math.round(soundscape.volume * 100)}%)
        </div>
        <input
          type="range"
          min={0}
          max={0.4}
          step={0.01}
          value={soundscape.volume}
          onChange={(e) => setSoundscape({ volume: Number(e.target.value) })}
          className="w-full"
        />
      </div>

      <div className="space-y-2">
        <p className="text-xs text-stone-400">Hum frequency (preference-based)</p>
        <div className="flex flex-wrap gap-2">
          {HUM_PRESETS.map((hz) => (
            <button
              key={hz}
              onClick={() => setSoundscape({ humFrequency: hz })}
              className={`px-3 py-1.5 rounded-lg text-xs ${
                soundscape.humFrequency === hz
                  ? 'bg-cyan-500/30 text-cyan-200'
                  : 'bg-white/5 text-stone-300 hover:bg-white/10'
              }`}
            >
              {hz} Hz
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
