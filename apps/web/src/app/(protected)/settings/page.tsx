import { createClient } from '@/lib/supabase/server';
import { getUserIntegrations } from '@/lib/services/integration-service';
import SettingsClient from './settings-client';

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: integrations } = await getUserIntegrations(user!.id);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">Settings</h1>
      <SettingsClient integrations={integrations ?? []} />
    </div>
  );
}
