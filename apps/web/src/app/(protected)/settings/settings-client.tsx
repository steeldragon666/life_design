'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { getStravaAuthUrl, getSpotifyAuthUrl, getNotionAuthUrl, getBankingAuthUrl, disconnectProvider } from './actions';
import { INTEGRATION_PROVIDERS } from '@/lib/integrations/providers';
import { useNudges, useAIStatus } from '@/providers/LifeDesignProvider';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';

interface Integration {
  id: string;
  provider: string;
  status: string;
}

interface SettingsClientProps {
  integrations: Integration[];
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="rounded-lg border p-4 space-y-3">{children}</div>
    </div>
  );
}

function ToggleRow({ label, description, value, onChange }: { label: string; description: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-1">
      <div>
        <p className="text-sm font-medium text-[#2A2623]">{label}</p>
        <p className="text-xs text-[#A8A198] mt-0.5">{description}</p>
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`relative w-10 h-5 rounded-full transition-colors ${value ? 'bg-[#5A7F5A]' : 'bg-[#D4CFC5]'}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${value ? 'translate-x-5' : ''}`} />
      </button>
    </div>
  );
}

export default function SettingsClient({ integrations }: SettingsClientProps) {
  const router = useRouter();
  const nudgeScheduler = useNudges();
  const { ready: aiReady, progress: aiProgress } = useAIStatus();
  const [nudgeTimes, setNudgeTimes] = useState({
    morning: '08:00',
    midday: '13:00',
    evening: '20:00',
  });
  const [digestDay, setDigestDay] = useState('sunday');
  const [aiEnabled, setAiEnabled] = useState(true);

  const mentorMemories = useLiveQuery(() => db.mentorMemory?.toArray() ?? []) ?? [];
  const completedChallenges = useLiveQuery(() =>
    db.activeChallenges.where('status').equals('completed').toArray()
  ) ?? [];

  async function handleConnect(provider: string) {
    if (provider === 'strava') {
      const { url } = await getStravaAuthUrl();
      if (url) window.location.href = url;
    } else if (provider === 'google_calendar' || provider === 'gmail') {
      window.location.href = `/api/auth/google?scope=${provider}`;
    } else if (provider === 'slack') {
      window.location.href = '/api/auth/slack';
    } else if (provider === 'instagram') {
      window.location.href = '/api/auth/instagram';
    } else if (provider === 'weather') {
      alert('Weather integration uses your postcode from your Profile. Make sure you have set it!');
    } else if (provider === 'spotify') {
      const { url } = await getSpotifyAuthUrl();
      if (url) window.location.href = url;
    } else if (provider === 'apple_health') {
      alert('Apple Health syncs automatically from the Life Design iOS app. Download it to connect your health data.');
    } else if (provider === 'notion') {
      const { url } = await getNotionAuthUrl();
      if (url) window.location.href = url;
    } else if (provider === 'banking') {
      const { url } = await getBankingAuthUrl();
      if (url) window.location.href = url;
    }
  }

  async function handleDisconnect(integrationId: string) {
    await disconnectProvider(integrationId);
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Integrations</h2>
        <p className="text-sm text-gray-600">
          Connect external services to enrich your AI mentor&apos;s understanding of your life.
        </p>

        <div className="space-y-3">
          {INTEGRATION_PROVIDERS.map((provider) => {
            const integration = integrations.find((i) => i.provider === provider.id);
            const isConnected = integration?.status === 'connected';

            return (
              <div
                key={provider.id}
                className="flex items-center justify-between rounded-lg border p-4"
              >
                <div className="flex-1">
                  <h3 className="font-semibold text-sm">{provider.name}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{provider.description}</p>
                  <span className="text-xs text-gray-400">Dimensions: {provider.dimension}</span>
                </div>
                <div className="shrink-0 ml-4">
                  {isConnected ? (
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-green-600 font-medium">Connected</span>
                      <button
                        onClick={() => handleDisconnect(integration!.id)}
                        className="text-xs text-red-500 hover:underline"
                      >
                        Disconnect
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleConnect(provider.id)}
                      className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs text-white hover:bg-indigo-700"
                    >
                      Connect
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <SectionCard title="Nudge Schedule">
        <p className="text-xs text-[#A8A198] mb-1">When should we send you gentle reminders?</p>
        {(['morning', 'midday', 'evening'] as const).map(slot => (
          <div key={slot} className="flex items-center justify-between py-2">
            <span className="text-sm font-medium text-[#2A2623] capitalize">{slot}</span>
            <input
              type="time"
              value={nudgeTimes[slot]}
              onChange={(e) => {
                setNudgeTimes(prev => ({ ...prev, [slot]: e.target.value }));
                const [h, m] = e.target.value.split(':').map(Number);
                nudgeScheduler.updateSchedule({ [slot]: { hour: h, minute: m } });
              }}
              className="text-sm font-mono text-[#5A7F5A] bg-[#F5F3EF] rounded-lg px-3 py-1.5 border border-[#E8E4DD]"
            />
          </div>
        ))}
      </SectionCard>

      <SectionCard title="Weekly Digest">
        <p className="text-xs text-[#A8A198] mb-1">Which day should your weekly digest generate?</p>
        <select
          value={digestDay}
          onChange={(e) => setDigestDay(e.target.value)}
          className="text-sm bg-[#F5F3EF] rounded-lg px-3 py-2 border border-[#E8E4DD] text-[#2A2623]"
        >
          {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(d => (
            <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>
          ))}
        </select>
      </SectionCard>

      <SectionCard title="AI Features">
        <ToggleRow
          label="On-Device AI"
          description="Enable local ML models for offline insights"
          value={aiEnabled}
          onChange={setAiEnabled}
        />
        <hr className="border-[#E8E4DD]" />
        <div className="flex items-center justify-between py-1">
          <div>
            <p className="text-sm font-medium text-[#2A2623]">Model Status</p>
            <p className="text-xs text-[#A8A198] mt-0.5">
              {aiReady ? 'Ready (~23MB cached)' : aiProgress > 0 ? `Loading... ${Math.round(aiProgress * 100)}%` : 'Not loaded'}
            </p>
          </div>
          {aiReady && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#F4F7F4] text-[#5A7F5A] font-medium">Active</span>
          )}
        </div>
      </SectionCard>

      <SectionCard title="Mentor Memory">
        <p className="text-xs text-[#A8A198] mb-1">Facts your AI mentor has learned about you</p>
        {mentorMemories.length === 0 ? (
          <p className="text-sm text-[#A8A198] italic">No memories yet. Chat with your mentor to build context.</p>
        ) : (
          <div className="space-y-2">
            {mentorMemories.map((mem) => (
              <div key={mem.id} className="flex items-center justify-between py-1.5">
                <span className="text-sm text-[#3D3833] truncate flex-1">{mem.content}</span>
                <button
                  onClick={async () => { if (mem.id) await db.mentorMemory.delete(mem.id); }}
                  className="text-[10px] text-[#D4864A] hover:underline ml-2 flex-shrink-0"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard title="Challenge History">
        {completedChallenges.length === 0 ? (
          <p className="text-sm text-[#A8A198] italic">No completed challenges yet.</p>
        ) : (
          <div className="space-y-2">
            {completedChallenges.map(ch => (
              <div key={ch.id} className="flex items-center justify-between py-1.5">
                <span className="text-sm text-[#3D3833]">{ch.challengeId}</span>
                <span className="text-[10px] text-[#A8A198] font-mono">
                  {ch.completedAt ? new Date(ch.completedAt).toLocaleDateString('en-AU', { month: 'short', day: 'numeric' }) : ''}
                </span>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
