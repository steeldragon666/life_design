'use client';

import { useState } from 'react';
import { Check, Shield } from 'lucide-react';

interface DataImportCardProps {
  onNext: () => void;
}

const INTEGRATIONS = [
  { id: 'strava', name: 'Strava', description: 'Running, cycling & fitness', icon: '\u{1F3C3}', authUrl: '/api/auth/strava' },
  { id: 'spotify', name: 'Spotify', description: 'Music & listening habits', icon: '\u{1F3B5}', authUrl: '/api/auth/spotify' },
  { id: 'google', name: 'Google Calendar', description: 'Events & time management', icon: '\u{1F4C5}', authUrl: '/api/auth/google' },
  { id: 'slack', name: 'Slack', description: 'Communication patterns', icon: '\u{1F4AC}', authUrl: '/api/auth/slack' },
  { id: 'notion', name: 'Notion', description: 'Notes & productivity', icon: '\u{1F4DD}', authUrl: '/api/auth/notion' },
];

export default function DataImportCard({ onNext }: DataImportCardProps) {
  const [connected, setConnected] = useState<string[]>([]);

  const handleConnect = (integration: typeof INTEGRATIONS[number]) => {
    // Open OAuth flow in popup
    const popup = window.open(integration.authUrl, '_blank', 'width=600,height=700');
    // Track connection (in production, listen for OAuth callback)
    const checkClosed = setInterval(() => {
      if (popup?.closed) {
        clearInterval(checkClosed);
        setConnected((prev) => [...new Set([...prev, integration.id])]);
        // Persist to API
        fetch('/api/onboarding/card', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ apps_connected: [...connected, integration.id] }),
        }).catch(() => {});
      }
    }, 500);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12 bg-gradient-to-b from-stone-50 to-stone-100">
      <div className="max-w-lg w-full space-y-8">
        <div className="text-center">
          <h2 className="font-serif text-3xl text-stone-900">Connect your apps</h2>
          <p className="text-stone-500 mt-3">Connecting apps lets our AI find deeper patterns in your life. You can always add more later.</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {INTEGRATIONS.map((integration) => {
            const isConnected = connected.includes(integration.id);
            return (
              <button
                key={integration.id}
                onClick={() => !isConnected && handleConnect(integration)}
                className={`p-4 rounded-xl border text-left transition-all ${
                  isConnected
                    ? 'bg-emerald-50 border-emerald-200'
                    : 'bg-white border-stone-100 hover:border-stone-300 hover:shadow-sm'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">{integration.icon}</span>
                  <span className="font-medium text-sm text-stone-900">{integration.name}</span>
                  {isConnected && (
                    <Check size={14} className="text-emerald-600 ml-auto" strokeWidth={3} />
                  )}
                </div>
                <p className="text-xs text-stone-500">{integration.description}</p>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-3 p-3 bg-stone-50 rounded-xl">
          <Shield size={16} className="text-stone-400 flex-shrink-0" />
          <p className="text-xs text-stone-500">We only read data — we never post or modify anything in your connected accounts.</p>
        </div>

        <div className="space-y-3">
          <button
            onClick={onNext}
            className="w-full py-4 rounded-2xl bg-stone-900 text-white font-medium text-lg hover:bg-stone-800 transition-colors"
          >
            {connected.length > 0 ? 'Continue' : 'Skip for now'}
          </button>
        </div>
      </div>
    </div>
  );
}
