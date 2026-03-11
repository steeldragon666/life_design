'use client';

import { useRouter } from 'next/navigation';
import { getStravaAuthUrl, getSpotifyAuthUrl, getNotionAuthUrl, getBankingAuthUrl, disconnectProvider } from './actions';
import { INTEGRATION_PROVIDERS } from '@/lib/integrations/providers';

interface Integration {
  id: string;
  provider: string;
  status: string;
}

interface SettingsClientProps {
  integrations: Integration[];
}

export default function SettingsClient({ integrations }: SettingsClientProps) {
  const router = useRouter();

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
    </div>
  );
}
