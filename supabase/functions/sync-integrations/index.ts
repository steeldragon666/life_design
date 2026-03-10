import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface StravaActivity {
  id: number;
  name: string;
  type: string;
  distance: number;
  moving_time: number;
  start_date: string;
}

async function fetchStravaActivities(accessToken: string): Promise<StravaActivity[]> {
  const after = Math.floor(Date.now() / 1000) - 7 * 24 * 60 * 60;
  const response = await fetch(
    `https://www.strava.com/api/v3/athlete/activities?after=${after}&per_page=30`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );

  if (!response.ok) {
    throw new Error(`Strava API error: ${response.status}`);
  }

  return response.json();
}

async function refreshStravaToken(
  supabase: ReturnType<typeof createClient>,
  integrationId: string,
  refreshToken: string,
): Promise<string> {
  const clientId = Deno.env.get('STRAVA_CLIENT_ID') ?? '';
  const clientSecret = Deno.env.get('STRAVA_CLIENT_SECRET') ?? '';

  const response = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    throw new Error('Token refresh failed');
  }

  const data = await response.json();

  await supabase
    .from('integrations')
    .update({
      access_token_encrypted: data.access_token,
      refresh_token_encrypted: data.refresh_token,
    })
    .eq('id', integrationId);

  return data.access_token;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: integrations } = await supabase
      .from('integrations')
      .select('*')
      .eq('provider', 'strava')
      .eq('status', 'connected');

    if (!integrations || integrations.length === 0) {
      return new Response(
        JSON.stringify({ synced: 0, message: 'No connected Strava integrations' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    let synced = 0;

    for (const integration of integrations) {
      try {
        let accessToken = integration.access_token_encrypted;

        // Try fetching activities; refresh token if 401
        let activities: StravaActivity[];
        try {
          activities = await fetchStravaActivities(accessToken);
        } catch {
          accessToken = await refreshStravaToken(
            supabase,
            integration.id,
            integration.refresh_token_encrypted,
          );
          activities = await fetchStravaActivities(accessToken);
        }

        // Store metrics
        for (const activity of activities) {
          await supabase.from('integration_metrics').upsert(
            {
              integration_id: integration.id,
              metric_name: 'activity',
              metric_value: activity.moving_time / 60,
              recorded_at: activity.start_date,
              raw_data: {
                id: activity.id,
                name: activity.name,
                type: activity.type,
                distance: activity.distance,
                moving_time: activity.moving_time,
              },
            },
            { onConflict: 'integration_id,metric_name,recorded_at' },
          );
        }

        synced++;
      } catch (err) {
        console.error(`Sync failed for integration ${integration.id}:`, err);
      }
    }

    return new Response(
      JSON.stringify({ synced, total: integrations.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('Sync error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
