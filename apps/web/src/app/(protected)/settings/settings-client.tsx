'use client';

import { useRouter } from 'next/navigation';
import { getStravaAuthUrl, disconnectProvider } from './actions';

interface Integration {
  id: string;
  provider: string;
  status: string;
}

interface SettingsClientProps {
  integrations: Integration[];
}

const PROVIDERS = [
  {
    id: 'strava',
    name: 'Strava',
    description: 'Sync fitness activities to your Health dimension.',
    dimension: 'Health',
  },
];

export default function SettingsClient({ integrations }: SettingsClientProps) {
  const router = useRouter();

  async function handleConnect(provider: string) {
    if (provider === 'strava') {
      const { url, error } = await getStravaAuthUrl();
      if (url) {
        window.location.href = url;
      }
    }
  }

  async function handleDisconnect(integrationId: string) {
    await disconnectProvider(integrationId);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Integrations</h2>
      <p className="text-gray-600">
        Connect external services to automatically enrich your check-in data.
      </p>

      {PROVIDERS.map((provider) => {
        const integration = integrations.find((i) => i.provider === provider.id);
        const isConnected = integration?.status === 'connected';

        return (
          <div
            key={provider.id}
            className="flex items-center justify-between rounded-lg border p-4"
          >
            <div>
              <h3 className="font-semibold">{provider.name}</h3>
              <p className="text-sm text-gray-500">{provider.description}</p>
              <span className="text-xs text-gray-400">Maps to: {provider.dimension}</span>
            </div>
            <div>
              {isConnected ? (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-green-600">Connected</span>
                  <button
                    onClick={() => handleDisconnect(integration!.id)}
                    className="text-sm text-red-600 hover:underline"
                  >
                    Disconnect
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => handleConnect(provider.id)}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700"
                >
                  Connect
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
