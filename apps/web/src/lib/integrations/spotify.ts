/**
 * Spotify integration using Spotify Web API.
 * Requires SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET env variables.
 *
 * Used by the AI mentor system to:
 * - Track listening patterns and correlate with mood
 * - Detect changes in music taste (e.g., shift to sad/energetic music)
 * - Suggest music-based activities aligned with user's interests
 */

import { createClient } from '@/lib/supabase/server';

export interface SpotifyListeningData {
  recentTracks: Array<{
    name: string;
    artist: string;
    playedAt: string;
  }>;
  topGenres: string[];
  currentlyPlaying: string | null;
  listeningHoursToday: number;
}

async function getAccessToken(userId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('integrations')
    .select('access_token_encrypted, refresh_token_encrypted, token_expires_at')
    .eq('user_id', userId)
    .eq('provider', 'spotify')
    .eq('status', 'connected')
    .single();

  if (!data) return null;

  // Refresh if expired
  if (data.token_expires_at && new Date(data.token_expires_at) < new Date()) {
    const refreshed = await refreshSpotifyToken(data.refresh_token_encrypted);
    if (!refreshed) return null;

    await supabase
      .from('integrations')
      .update({
        access_token_encrypted: refreshed.access_token,
        token_expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
      })
      .eq('user_id', userId)
      .eq('provider', 'spotify');

    return refreshed.access_token;
  }

  return data.access_token_encrypted;
}

async function refreshSpotifyToken(refreshToken: string): Promise<{ access_token: string; expires_in: number } | null> {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  try {
    const res = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    });

    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function getRecentListening(userId: string): Promise<SpotifyListeningData | null> {
  const token = await getAccessToken(userId);
  if (!token) return null;

  try {
    const [recentRes, topRes] = await Promise.all([
      fetch('https://api.spotify.com/v1/me/player/recently-played?limit=10', {
        headers: { Authorization: `Bearer ${token}` },
      }),
      fetch('https://api.spotify.com/v1/me/top/artists?time_range=short_term&limit=5', {
        headers: { Authorization: `Bearer ${token}` },
      }),
    ]);

    const recentData = recentRes.ok ? await recentRes.json() : { items: [] };
    const topData = topRes.ok ? await topRes.json() : { items: [] };

    const recentTracks = (recentData.items ?? []).map((item: Record<string, unknown>) => ({
      name: (item.track as Record<string, unknown>)?.name as string ?? '',
      artist: ((item.track as Record<string, unknown>)?.artists as Array<{ name: string }>)?.[0]?.name ?? '',
      playedAt: item.played_at as string ?? '',
    }));

    const topGenres = (topData.items ?? [])
      .flatMap((artist: Record<string, unknown>) => (artist.genres as string[]) ?? [])
      .filter((g: string, i: number, a: string[]) => a.indexOf(g) === i)
      .slice(0, 5);

    // Estimate listening hours today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayTracks = recentTracks.filter(
      (t: { playedAt: string }) => new Date(t.playedAt) >= todayStart,
    );
    const listeningHoursToday = Math.round((todayTracks.length * 3.5) / 60 * 10) / 10; // ~3.5 min avg per track

    return {
      recentTracks,
      topGenres,
      currentlyPlaying: null, // Would need /me/player endpoint
      listeningHoursToday,
    };
  } catch {
    return null;
  }
}

/**
 * Build Spotify context string for AI mentor system prompt.
 */
export async function buildSpotifyContext(userId: string): Promise<string | null> {
  const data = await getRecentListening(userId);
  if (!data) return null;

  const lines: string[] = ['\nSpotify Listening:'];

  if (data.topGenres.length > 0) {
    lines.push(`- Top genres lately: ${data.topGenres.join(', ')}`);
  }

  if (data.recentTracks.length > 0) {
    const recent = data.recentTracks.slice(0, 3);
    lines.push(`- Recently played: ${recent.map((t) => `"${t.name}" by ${t.artist}`).join(', ')}`);
  }

  lines.push(`- Listening time today: ~${data.listeningHoursToday} hours`);

  if (data.listeningHoursToday > 4) {
    lines.push('- NOTE: High listening time today — could indicate background listening while working, or using music as emotional regulation');
  }

  return lines.join('\n');
}
