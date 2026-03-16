import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getArchetypeConfig, ARCHETYPE_CONFIGS, type MentorArchetype } from '@/lib/mentor-archetypes';

const ELEVENLABS_API_BASE = 'https://api.elevenlabs.io/v1';
const MAX_TEXT_LENGTH = 5000;

interface TTSRequestBody {
  text: string;
  archetype: MentorArchetype;
  speed?: number;
}

export async function POST(request: NextRequest): Promise<NextResponse | Response> {
  // 1. Authenticate — route is NOT covered by middleware (/api/* paths are skipped)
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Check API key
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'TTS not configured' }, { status: 503 });
  }

  // 3. Parse and validate body
  let body: TTSRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const { text, archetype, speed } = body;

  if (!text || !archetype) {
    return NextResponse.json({ error: 'Missing text or archetype' }, { status: 400 });
  }

  if (text.length > MAX_TEXT_LENGTH) {
    return NextResponse.json({ error: `Text exceeds ${MAX_TEXT_LENGTH} character limit` }, { status: 400 });
  }

  const validArchetypes = ARCHETYPE_CONFIGS.map((c) => c.id);
  if (!validArchetypes.includes(archetype)) {
    return NextResponse.json({ error: 'Invalid archetype' }, { status: 400 });
  }

  if (speed != null && (typeof speed !== 'number' || speed < 0.7 || speed > 1.2)) {
    return NextResponse.json({ error: 'speed must be between 0.7 and 1.2' }, { status: 400 });
  }

  // 4. Rate limiting via Supabase (survives serverless cold starts)
  const { data: rateData } = await supabase
    .from('tts_rate_limits')
    .select('request_count, window_start')
    .eq('user_id', user.id)
    .single();

  const now = new Date();
  const windowStart = rateData?.window_start ? new Date(rateData.window_start) : null;
  const windowExpired = !windowStart || (now.getTime() - windowStart.getTime() > 3600_000);

  if (!windowExpired && rateData && rateData.request_count >= 60) {
    return NextResponse.json({ error: 'Rate limit exceeded (60/hour)' }, { status: 429 });
  }

  const { error: upsertError } = await supabase.from('tts_rate_limits').upsert({
    user_id: user.id,
    request_count: windowExpired ? 1 : (rateData?.request_count ?? 0) + 1,
    window_start: windowExpired ? now.toISOString() : rateData?.window_start,
  });
  if (upsertError) {
    console.error('[tts] rate limit upsert failed:', upsertError.message);
  }

  // 5. Call ElevenLabs
  const config = getArchetypeConfig(archetype);

  const elevenLabsResponse = await fetch(
    `${ELEVENLABS_API_BASE}/text-to-speech/${config.elevenLabsVoiceId}/stream`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg',
      },
      body: JSON.stringify({
        text,
        model_id: config.elevenLabsModelId,
        voice_settings: {
          stability: config.voiceSettings.stability,
          similarity_boost: config.voiceSettings.similarityBoost,
          style: config.voiceSettings.style,
          use_speaker_boost: config.voiceSettings.useSpeakerBoost,
        },
        ...(speed != null && speed !== 1.0 ? { speed } : {}),
      }),
    }
  );

  if (!elevenLabsResponse.ok || !elevenLabsResponse.body) {
    const upstreamStatus = elevenLabsResponse.status;
    const clientStatus = upstreamStatus === 422 ? 400 : 503;
    return NextResponse.json(
      { error: 'TTS generation failed' },
      { status: clientStatus }
    );
  }

  // 6. Stream audio back to client
  return new Response(elevenLabsResponse.body, {
    headers: {
      'Content-Type': 'audio/mpeg',
      'Transfer-Encoding': 'chunked',
      'Cache-Control': 'no-cache',
    },
  });
}
