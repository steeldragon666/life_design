'use server';

import { createClient } from '@/lib/supabase/server';
import { disconnectIntegration } from '@/lib/services/integration-service';
import { buildAuthorizationUrl, STRAVA_CONFIG, SPOTIFY_CONFIG, NOTION_CONFIG, OPENBANKING_CONFIG } from '@/lib/integrations/oauth';
import { randomBytes } from 'crypto';

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

export async function getStravaAuthUrl() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { url: null, error: 'Not authenticated' };

  const state = randomBytes(16).toString('hex');
  const redirectUri = `${appUrl}/api/integrations/strava/callback`;
  const url = buildAuthorizationUrl(STRAVA_CONFIG, redirectUri, state);

  return { url, error: null };
}

export async function getSpotifyAuthUrl() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { url: null, error: 'Not authenticated' };

  const state = randomBytes(16).toString('hex');
  const redirectUri = `${appUrl}/api/integrations/spotify/callback`;
  const url = buildAuthorizationUrl(SPOTIFY_CONFIG, redirectUri, state);

  return { url, error: null };
}

export async function getNotionAuthUrl() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { url: null, error: 'Not authenticated' };

  const state = randomBytes(16).toString('hex');
  const redirectUri = `${appUrl}/api/integrations/notion/callback`;
  const url = buildAuthorizationUrl(NOTION_CONFIG, redirectUri, state);

  return { url, error: null };
}

export async function getBankingAuthUrl() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { url: null, error: 'Not authenticated' };

  const state = randomBytes(16).toString('hex');
  const redirectUri = `${appUrl}/api/integrations/banking/callback`;
  const url = buildAuthorizationUrl(OPENBANKING_CONFIG, redirectUri, state);

  return { url, error: null };
}

export async function disconnectProvider(integrationId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: 'Not authenticated' };

  const { error } = await disconnectIntegration(integrationId);
  return { error: error ? error.message : null };
}
