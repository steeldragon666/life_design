'use client';

import { useTheme, useThemeOptional } from './theme-provider';
import { Sparkles, Waves, Crown, Check, Palette } from 'lucide-react';
import { useState } from 'react';

const themes = [
  {
    id: 'botanical' as const,
    name: 'Ethereal Botanical',
    description: 'Soft pinks, gentle purples, and organic warmth inspired by spring blossoms',
    icon: Sparkles,
    colors: ['#e8b4d0', '#c5b8d4', '#b8c5a8'],
    cardClass: 'theme-card-botanical',
  },
  {
    id: 'ocean' as const,
    name: 'Ocean Zen',
    description: 'Calming teals and water ripples for tranquility and flow',
    icon: Waves,
    colors: ['#5fb3b3', '#8fd4d4', '#b8e6e6'],
    cardClass: 'theme-card-ocean',
  },
  {
    id: 'modern' as const,
    name: 'Dark Modern',
    description: 'Sophisticated dark tones with warm gold accents',
    icon: Crown,
    colors: ['#c9a86c', '#d4a574', '#b87333'],
    cardClass: 'theme-card-modern',
  },
];

export default function ThemeSelector() {
  const { theme: currentTheme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-xl bg-white/5 flex items-center justify-center">
          <Palette size={20} weight="light" className="text-stone-300" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">Choose Your Aesthetic</h2>
          <p className="text-sm text-stone-500">Select a theme that resonates with you</p>
        </div>
      </div>

      {/* Theme Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {themes.map((theme) => {
          const Icon = theme.icon;
          const isActive = currentTheme === theme.id;

          return (
            <button
              key={theme.id}
              onClick={() => setTheme(theme.id)}
              className={`theme-card ${theme.cardClass} ${isActive ? 'active' : ''} text-left group`}
            >
              {/* Active Indicator */}
              {isActive && (
                <div className="absolute top-4 right-4 h-6 w-6 rounded-full bg-white/20 flex items-center justify-center">
                  <Check size={16} strokeWidth={2.5} className="text-white" />
                </div>
              )}

              {/* Color Preview */}
              <div className="flex gap-2 mb-4">
                {theme.colors.map((color, i) => (
                  <div
                    key={i}
                    className="h-8 w-8 rounded-full shadow-lg transition-transform group-hover:scale-110"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>

              {/* Icon */}
              <div
                className="h-12 w-12 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110"
                style={{ backgroundColor: `${theme.colors[0]}30` }}
              >
                <Icon
                  size={24}
                                   style={{ color: theme.colors[0] }}
                />
              </div>

              {/* Content */}
              <h3 className="text-lg font-semibold text-white mb-2">
                {theme.name}
              </h3>
              <p className="text-sm text-stone-400 leading-relaxed">
                {theme.description}
              </p>

              {/* Preview Bar */}
              <div
                className="mt-4 h-1.5 rounded-full w-full"
                style={{
                  background: `linear-gradient(90deg, ${theme.colors[0]} 0%, ${theme.colors[1]} 50%, ${theme.colors[2]} 100%)`
                }}
              />
            </button>
          );
        })}
      </div>

      {/* Current Theme Display */}
      <div className="mt-6 p-4 rounded-2xl bg-white/5 border border-white/10">
        <p className="text-sm text-stone-400">
          Currently active: <span className="text-white font-semibold">
            {themes.find(t => t.id === currentTheme)?.name}
          </span>
        </p>
      </div>
    </div>
  );
}

// Inline compact selector for navigation
export function ThemeSelectorCompact() {
  const themeContext = useThemeOptional();
  if (!themeContext) {
    return null;
  }

  const { theme, setTheme } = themeContext;

  return (
    <div className="flex items-center gap-2 p-1 rounded-xl bg-white/5 border border-white/10">
      {themes.map((t) => {
        const Icon = t.icon;
        return (
          <button
            key={t.id}
            onClick={() => setTheme(t.id)}
            className={`p-2 rounded-lg transition-all ${
              theme === t.id
                ? 'bg-white/10 shadow-sm'
                : 'hover:bg-white/5'
            }`}
            title={t.name}
          >
            <Icon
              size={16}
                           style={{ color: theme === t.id ? t.colors[0] : '#78716c' }}
            />
          </button>
        );
      })}
    </div>
  );
}
