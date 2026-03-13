'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { 
  Settings, 
  Sparkles, 
  Palette,
  Instagram,
  Music,
  Dumbbell,
  FileText,
  MessageSquare,
  Calendar,
  Linkedin,
  CheckCircle2,
  X,
  ExternalLink,
  Volume2,
  BellRing
} from 'lucide-react';
import ThemeSelector from '@/components/theme/theme-selector';
import { ThemeSelectorCompact } from '@/components/theme/theme-selector';
import VoiceSelector, { VOICE_OPTIONS } from '@/components/voice/voice-selector';
import { useGuest, type MicroMomentsCadence } from '@/lib/guest-context';
import ArchetypeSelector from '@/components/mentor/archetype-selector';
import SoundscapeControls from '@/components/audio/soundscape-controls';
import { getArchetypeConfig, getRecommendedVoiceForArchetype, type MentorArchetype } from '@/lib/mentor-archetypes';

const integrations = [
  {
    id: 'instagram',
    name: 'Instagram',
    description: 'Share your visual journey and creative moments',
    icon: Instagram,
    authUrl: '/api/auth/instagram',
    color: 'from-pink-500 to-purple-500',
    bgColor: 'bg-pink-500/10',
    iconColor: 'text-pink-400',
  },
  {
    id: 'spotify',
    name: 'Spotify',
    description: 'Connect your music and podcast listening habits',
    icon: Music,
    authUrl: '/api/auth/spotify',
    color: 'from-green-500 to-emerald-500',
    bgColor: 'bg-green-500/10',
    iconColor: 'text-green-400',
  },
  {
    id: 'strava',
    name: 'Strava',
    description: 'Track your fitness activities and outdoor adventures',
    icon: Dumbbell,
    authUrl: '/api/auth/strava',
    color: 'from-orange-500 to-red-500',
    bgColor: 'bg-orange-500/10',
    iconColor: 'text-orange-400',
  },
  {
    id: 'notion',
    name: 'Notion',
    description: 'Sync your notes, tasks, and knowledge base',
    icon: FileText,
    authUrl: '/api/auth/notion',
    color: 'from-slate-400 to-slate-300',
    bgColor: 'bg-slate-500/10',
    iconColor: 'text-slate-300',
  },
  {
    id: 'slack',
    name: 'Slack',
    description: 'Connect your work communication and team activity',
    icon: MessageSquare,
    authUrl: '/api/auth/slack',
    color: 'from-purple-500 to-indigo-500',
    bgColor: 'bg-purple-500/10',
    iconColor: 'text-purple-400',
  },
  {
    id: 'google',
    name: 'Google Calendar',
    description: 'Sync your schedule and time management',
    icon: Calendar,
    authUrl: '/api/auth/google',
    color: 'from-blue-500 to-cyan-500',
    bgColor: 'bg-blue-500/10',
    iconColor: 'text-blue-400',
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    description: 'Connect your professional network and career insights',
    icon: Linkedin,
    authUrl: '/api/auth/linkedin',
    color: 'from-blue-600 to-blue-700',
    bgColor: 'bg-blue-600/10',
    iconColor: 'text-blue-500',
  },
];

const MICRO_MOMENT_CADENCE_OPTIONS: Array<{
  id: MicroMomentsCadence;
  label: string;
  description: string;
}> = [
  {
    id: 'light',
    label: 'Light',
    description: 'Morning and evening touchpoints only.',
  },
  {
    id: 'balanced',
    label: 'Balanced',
    description: 'Morning, midday, and evening rhythm.',
  },
  {
    id: 'focused',
    label: 'Focused',
    description: 'Higher-intent prompts through the day.',
  },
];

export default function SettingsPage() {
  const searchParams = useSearchParams();
  const { 
    integrations: connectedIntegrations, 
    addIntegration, 
    removeIntegration,
    voicePreference,
    setVoicePreference,
    mentorProfile,
    setMentorProfile,
    microMoments,
    setMicroMoments,
  } = useGuest();
  const [notification, setNotification] = useState<string | null>(null);
  const [billing, setBilling] = useState<{
    authenticated: boolean;
    hasAccess: boolean;
    subscription: {
      status?: string;
      plan_type?: string;
      trial_end?: string | null;
      current_period_end?: string | null;
      lifetime_access?: boolean;
    } | null;
  } | null>(null);

  const selectedVoice = VOICE_OPTIONS.find(v => v.id === voicePreference);
  const archetypeConfig = getArchetypeConfig(mentorProfile.archetype);

  // Handle OAuth callback
  useEffect(() => {
    const connected = searchParams.get('connected');
    const tokenData = searchParams.get('token');
    const error = searchParams.get('error');

    if (connected && tokenData) {
      try {
        const tokenInfo = JSON.parse(decodeURIComponent(tokenData));
        addIntegration({
          provider: tokenInfo.provider,
          access_token: tokenInfo.access_token,
          refresh_token: tokenInfo.refresh_token,
          expires_at: tokenInfo.expires_at,
          metadata: tokenInfo,
        });
        setNotification(`Successfully connected ${connected}!`);
      } catch (e) {
        console.error('Failed to parse token data:', e);
      }
    }

    if (error) {
      const provider = error.split('_')[0];
      setNotification(`Failed to connect ${provider}. Please try again.`);
    }
  }, [searchParams, addIntegration]);

  // Clear notification after 5 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  useEffect(() => {
    let isCancelled = false;
    async function loadBillingStatus() {
      try {
        const response = await fetch('/api/billing/status');
        if (!response.ok) return;
        const data = await response.json();
        if (!isCancelled) setBilling(data);
      } catch {
        // Billing status is optional; ignore transient failures.
      }
    }
    void loadBillingStatus();
    return () => {
      isCancelled = true;
    };
  }, []);

  const isConnected = (providerId: string) => {
    return connectedIntegrations.some(i => i.provider === providerId);
  };

  const handleDisconnect = (providerId: string) => {
    removeIntegration(providerId);
    setNotification(`Disconnected ${providerId}`);
  };

  const handleArchetypeSelect = (archetype: MentorArchetype) => {
    const cfg = getArchetypeConfig(archetype);
    const recommendedVoice = getRecommendedVoiceForArchetype(archetype);
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
  };

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      {/* Notification Banner */}
      {notification && (
        <div className={`p-4 rounded-2xl flex items-center gap-3 animate-fade-in ${
          notification.includes('Successfully') 
            ? 'bg-emerald-500/10 border border-emerald-500/20' 
            : 'bg-red-500/10 border border-red-500/20'
        }`}>
          {notification.includes('Successfully') ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
          ) : (
            <X className="h-5 w-5 text-red-400" />
          )}
          <p className={`text-sm ${notification.includes('Successfully') ? 'text-emerald-400' : 'text-red-400'}`}>
            {notification}
          </p>
          <button 
            onClick={() => setNotification(null)}
            className="ml-auto text-slate-500 hover:text-slate-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="glass-card p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 opacity-50">
          <Image
            src="/images/life-dimensions-3d-icons.png"
            alt="Life Dimensions"
            width={256}
            height={256}
            className="object-contain"
          />
        </div>
        
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-white/5 flex items-center justify-center">
                <Settings className="h-5 w-5 text-slate-300" />
              </div>
              <div>
                <h1 className="text-[28px] font-bold text-white tracking-tight">
                  Settings
                </h1>
                <p className="text-sm text-slate-500">Customize your experience</p>
              </div>
            </div>
            <ThemeSelectorCompact />
          </div>
        </div>
      </div>

      {/* Theme Selection */}
      <div className="glass-card p-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-pink-400/20 to-purple-400/20 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-pink-300" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white">Aesthetic</h2>
            <p className="text-sm text-slate-500">Personalize your visual experience</p>
          </div>
        </div>
        
        <div className="mt-6">
          <ThemeSelector />
        </div>
      </div>

      {/* Voice Companion Selection */}
      <div className="glass-card p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-teal-400/20 to-blue-400/20 flex items-center justify-center">
            <Volume2 className="h-5 w-5 text-teal-300" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white">Voice Companion</h2>
            <p className="text-sm text-slate-500">
              Currently: <span className="text-teal-400">{selectedVoice?.name}</span> ({selectedVoice?.accent}, {selectedVoice?.gender})
            </p>
          </div>
        </div>
        
        <VoiceSelector
          selectedVoice={voicePreference}
          onSelect={setVoicePreference}
          showPreview={true}
        />
      </div>

      {/* Mentor Archetype */}
      <div className="glass-card p-8 space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-white">Mentor Archetype</h2>
          <p className="text-sm text-slate-500">
            Current archetype: <span className="text-cyan-300">{archetypeConfig.label}</span>
          </p>
        </div>
        <ArchetypeSelector selected={mentorProfile.archetype} onSelect={handleArchetypeSelect} />
      </div>

      {/* Meditation Soundscape */}
      <SoundscapeControls />

      {/* Micro-Moments */}
      <div className="glass-card p-8 space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-teal-400/20 to-cyan-400/20 flex items-center justify-center">
            <BellRing className="h-5 w-5 text-teal-200" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white">Micro-Moments</h2>
            <p className="text-sm text-slate-500">
              In-app mentor touchpoints to keep your day intentional.
            </p>
          </div>
        </div>

        <label className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-300">
          <span>Enable in-app micro-moment nudges</span>
          <input
            type="checkbox"
            checked={microMoments.enabled}
            onChange={(e) => setMicroMoments({ enabled: e.target.checked })}
          />
        </label>

        <div className="space-y-2">
          <p className="text-sm text-slate-400">Preferred cadence</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {MICRO_MOMENT_CADENCE_OPTIONS.map((option) => {
              const isActive = option.id === microMoments.cadence;
              return (
                <button
                  key={option.id}
                  type="button"
                  disabled={!microMoments.enabled}
                  onClick={() => setMicroMoments({ cadence: option.id })}
                  className={`text-left rounded-xl border p-4 transition-all ${
                    isActive
                      ? 'bg-cyan-500/15 border-cyan-400/50'
                      : 'bg-white/[0.02] border-white/10 hover:border-white/20'
                  } ${!microMoments.enabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <p className="text-sm font-semibold text-white">{option.label}</p>
                  <p className="text-xs text-slate-400 mt-1">{option.description}</p>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Integrations Section */}
      <div className="glass-card p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-white/5 flex items-center justify-center">
              <ExternalLink className="h-5 w-5 text-slate-300" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">Integrations</h2>
              <p className="text-sm text-slate-500">
                Connect your accounts for a richer experience
              </p>
            </div>
          </div>
          <div className="badge-theme">
            {connectedIntegrations.length} Connected
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {integrations.map((integration) => {
            const Icon = integration.icon;
            const connected = isConnected(integration.id);

            return (
              <div
                key={integration.id}
                className={`p-5 rounded-2xl border transition-all ${
                  connected
                    ? 'bg-white/5 border-white/10'
                    : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04]'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={`h-12 w-12 rounded-xl ${integration.bgColor} flex items-center justify-center`}>
                    <Icon className={`h-6 w-6 ${integration.iconColor}`} />
                  </div>
                  {connected ? (
                    <div className="flex items-center gap-2">
                      <span className="badge-green text-xs">Connected</span>
                      <button
                        onClick={() => handleDisconnect(integration.id)}
                        className="p-1.5 rounded-lg hover:bg-white/10 text-slate-500 hover:text-red-400 transition-colors"
                        title="Disconnect"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <a
                      href={integration.authUrl}
                      className="btn-secondary py-2 px-4 text-sm"
                    >
                      Connect
                    </a>
                  )}
                </div>

                <h3 className="text-lg font-semibold text-white mb-1">
                  {integration.name}
                </h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  {integration.description}
                </p>

                {connected && (
                  <div className="mt-3 pt-3 border-t border-white/5">
                    <p className="text-xs text-slate-500">
                      Connected on {new Date(connectedIntegrations.find(i => i.provider === integration.id)?.connected_at || '').toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-6 p-4 rounded-xl bg-white/5 border border-white/5">
          <p className="text-sm text-slate-400">
            <span className="text-slate-300 font-medium">Privacy Note:</span> Your integration tokens are stored locally on your device. 
            We never store your credentials on our servers. You can disconnect any integration at any time.
          </p>
        </div>
      </div>

      {/* Billing */}
      <div className="glass-card p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-white">Billing</h2>
            <p className="text-sm text-slate-500">Manage your plan and subscription access</p>
          </div>
          <div className={`badge-theme ${billing?.hasAccess ? 'text-emerald-300' : 'text-amber-300'}`}>
            {billing?.hasAccess ? 'Access Active' : 'No Active Plan'}
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-300 space-y-2">
          <p>Status: <span className="text-white">{billing?.subscription?.status ?? 'none'}</span></p>
          <p>Plan: <span className="text-white">{billing?.subscription?.plan_type ?? 'none'}</span></p>
          <p>Trial end: <span className="text-white">{billing?.subscription?.trial_end ?? 'n/a'}</span></p>
          <p>Period end: <span className="text-white">{billing?.subscription?.current_period_end ?? 'n/a'}</span></p>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <form action="/api/billing/checkout" method="POST">
            <input type="hidden" name="plan" value="annual" />
            <button
              type="submit"
              className="inline-flex rounded-lg border border-cyan-500/40 bg-cyan-500/20 px-4 py-2 text-sm text-cyan-100 hover:bg-cyan-500/30"
            >
              Upgrade to annual
            </button>
          </form>
          <form action="/api/billing/portal" method="POST">
            <button
              type="submit"
              className="inline-flex rounded-lg border border-white/20 px-4 py-2 text-sm text-white hover:bg-white/10"
            >
              Open billing portal
            </button>
          </form>
        </div>
      </div>

      {/* About Section */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-xl bg-white/5 flex items-center justify-center">
            <Palette className="h-5 w-5 text-slate-300" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">About Life Design</h2>
            <p className="text-sm text-slate-500">Your personal intelligence platform</p>
          </div>
        </div>
        
        <div className="space-y-3 text-sm text-slate-400">
          <p>
            Life Design helps you track goals, gain AI-powered insights, and create meaningful progress 
            across all dimensions of your life.
          </p>
          <div className="flex items-center gap-4 pt-2">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-teal-500" />
              AI Voice Agent
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-blue-500" />
              Local Storage
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-purple-500" />
              Privacy First
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
