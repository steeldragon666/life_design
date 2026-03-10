import { createClient } from '@/lib/supabase/server';

export async function getUserIntegrations(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('integrations')
    .select('*')
    .eq('user_id', userId);
  return { data, error };
}

export async function connectIntegration(
  userId: string,
  provider: string,
  accessToken: string,
  refreshToken: string,
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('integrations')
    .upsert(
      {
        user_id: userId,
        provider,
        status: 'connected',
        access_token_encrypted: accessToken,
        refresh_token_encrypted: refreshToken,
      },
      { onConflict: 'user_id,provider' },
    )
    .select()
    .single();
  return { data, error };
}

export async function disconnectIntegration(integrationId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('integrations')
    .update({ status: 'disconnected', access_token_encrypted: null, refresh_token_encrypted: null })
    .eq('id', integrationId);
  return { data, error };
}
