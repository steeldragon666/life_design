'use client';

import { useState } from 'react';

interface ConnectAppsCardProps {
  onNext: () => void;
}

const INTEGRATIONS = [
  { id: 'strava', name: 'Strava', description: 'Track workouts & activity', icon: '🏃', authUrl: '/api/auth/strava' },
  { id: 'spotify', name: 'Spotify', description: 'Music & listening patterns', icon: '🎵', authUrl: '/api/auth/spotify' },
  { id: 'google', name: 'Google Calendar', description: 'Schedule & time use', icon: '📅', authUrl: '/api/auth/google' },
  { id: 'slack', name: 'Slack', description: 'Communication activity', icon: '💬', authUrl: '/api/auth/slack' },
  { id: 'notion', name: 'Notion', description: 'Notes & knowledge', icon: '📝', authUrl: '/api/auth/notion' },
];

export default function ConnectAppsCard({ onNext }: ConnectAppsCardProps) {
  const [connected, setConnected] = useState<string[]>([]);

  const handleConnect = (integration: typeof INTEGRATIONS[number]) => {
    const popup = window.open(integration.authUrl, '_blank', 'width=600,height=700');
    const checkClosed = setInterval(() => {
      if (popup?.closed) {
        clearInterval(checkClosed);
        const updated = [...new Set([...connected, integration.id])];
        setConnected(updated);
        fetch('/api/onboarding/card', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ apps_connected: updated }),
        }).catch(() => {});
      }
    }, 500);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12 bg-gradient-to-b from-stone-50 to-stone-100">
      <div className="max-w-lg w-full space-y-8">
        <div className="text-center">
          <h2 className="font-serif text-3xl text-stone-900">Connect your apps</h2>
          <p className="text-stone-500 mt-3">The more data sources Opt In can learn from, the better your insights will be.</p>
        </div>

        <div className="space-y-3">
          {INTEGRATIONS.map((integration) => {
            const isConnected = connected.includes(integration.id);
            return (
              <button
                key={integration.id}
                onClick={() => !isConnected && handleConnect(integration)}
                className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all text-left ${
                  isConnected
                    ? 'bg-emerald-50 border-emerald-200'
                    : 'bg-white border-stone-100 hover:border-stone-300 hover:shadow-sm'
                }`}
              >
                <span className="text-2xl">{integration.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-stone-900">{integration.name}</p>
                  <p className="text-xs text-stone-500">{integration.description}</p>
                </div>
                {isConnected ? (
                  <span className="text-xs font-medium text-emerald-600 bg-emerald-100 px-2 py-1 rounded-full">Connected</span>
                ) : (
                  <span className="text-xs font-medium text-stone-500 bg-stone-100 px-2 py-1 rounded-full">Connect</span>
                )}
              </button>
            );
          })}
        </div>

        <button
          onClick={onNext}
          className="w-full py-4 rounded-2xl bg-stone-900 text-white font-medium text-lg hover:bg-stone-800 transition-colors"
        >
          {connected.length > 0 ? `Continue with ${connected.length} app${connected.length > 1 ? 's' : ''}` : 'Skip for now'}
        </button>
      </div>
    </div>
  );
}
