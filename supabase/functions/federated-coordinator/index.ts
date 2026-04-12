import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ALLOWED_ORIGIN = Deno.env.get('APP_URL') ?? 'https://lifedesign.app';

const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SubmitPayload {
  action: 'submit';
  roundId: string;
  weights: number[];
  bias: number;
  sampleCount: number;
}

interface AggregatePayload {
  action: 'aggregate';
  roundId: string;
}

interface CreateRoundPayload {
  action: 'create_round';
  targetDimension: string;
  minParticipants?: number;
}

interface GetStatusPayload {
  action: 'get_status';
  roundId?: string;
  targetDimension?: string;
}

interface GetResultPayload {
  action: 'get_result';
  roundId: string;
}

type RequestPayload =
  | SubmitPayload
  | AggregatePayload
  | CreateRoundPayload
  | GetStatusPayload
  | GetResultPayload;

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Missing authorization' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const serviceClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = (await req.json()) as RequestPayload;

    // Service-secret check for privileged actions
    if (body.action === 'aggregate' || body.action === 'create_round') {
      const serviceSecret = req.headers.get('x-service-secret');
      if (serviceSecret !== Deno.env.get('SERVICE_SECRET')) {
        return new Response(
          JSON.stringify({ error: `Forbidden: ${body.action} requires service authorization` }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
    }

    if (body.action === 'submit') {
      return await handleSubmit(supabase, user.id, body as SubmitPayload);
    } else if (body.action === 'aggregate') {
      return await handleAggregate(serviceClient, body as AggregatePayload);
    } else if (body.action === 'create_round') {
      return await handleCreateRound(serviceClient, body as CreateRoundPayload);
    } else if (body.action === 'get_status') {
      return await handleGetStatus(supabase, user.id, body as GetStatusPayload);
    } else if (body.action === 'get_result') {
      return await handleGetResult(supabase, body as GetResultPayload);
    } else {
      return new Response(
        JSON.stringify({
          error:
            'Unknown action. Use "submit", "aggregate", "create_round", "get_status", or "get_result".',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function handleSubmit(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  payload: SubmitPayload,
) {
  // Validate submission payload
  if (!Array.isArray(payload.weights) || typeof payload.bias !== 'number' || !Number.isFinite(payload.sampleCount) || payload.sampleCount <= 0) {
    return new Response(JSON.stringify({ error: 'Invalid submission payload' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  // Verify round is open
  const { data: round, error: roundErr } = await supabase
    .from('federated_rounds')
    .select('id, status')
    .eq('id', payload.roundId)
    .single();

  if (roundErr || !round) {
    return new Response(JSON.stringify({ error: 'Round not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (round.status !== 'open') {
    return new Response(JSON.stringify({ error: 'Round is not open for submissions' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { error: insertErr } = await supabase.from('gradient_submissions').upsert(
    {
      round_id: payload.roundId,
      user_id: userId,
      weights: payload.weights,
      bias: payload.bias,
      sample_count: payload.sampleCount,
    },
    { onConflict: 'round_id,user_id' },
  );

  if (insertErr) {
    return new Response(JSON.stringify({ error: insertErr.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function handleAggregate(
  serviceClient: ReturnType<typeof createClient>,
  payload: AggregatePayload,
) {
  // Get the round
  const { data: round, error: roundErr } = await serviceClient
    .from('federated_rounds')
    .select('*')
    .eq('id', payload.roundId)
    .single();

  if (roundErr || !round) {
    return new Response(JSON.stringify({ error: 'Round not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (round.status !== 'open') {
    return new Response(JSON.stringify({ error: 'Round is not open' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Atomic compare-and-swap: only transition open → aggregating
  const { data: updated, error: casErr } = await serviceClient
    .from('federated_rounds')
    .update({ status: 'aggregating' })
    .eq('id', payload.roundId)
    .eq('status', 'open')
    .select('id');

  if (casErr || !updated || updated.length === 0) {
    return new Response(
      JSON.stringify({ error: 'Round already being aggregated (concurrent request)' }),
      { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  // Fetch all submissions
  const { data: submissions, error: subErr } = await serviceClient
    .from('gradient_submissions')
    .select('user_id, weights, bias, sample_count')
    .eq('round_id', payload.roundId);

  if (subErr || !submissions) {
    return new Response(JSON.stringify({ error: 'Failed to fetch submissions' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Validate weight dimensions are consistent across submissions
  const nWeights = (submissions[0].weights as number[]).length;
  if (!submissions.every((s: any) => Array.isArray(s.weights) && (s.weights as number[]).length === nWeights)) {
    return new Response(JSON.stringify({ error: 'Inconsistent weight dimensions across submissions' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  // Check minimum participants
  if (submissions.length < (round.min_participants ?? 5)) {
    // Revert status back to open
    await serviceClient
      .from('federated_rounds')
      .update({ status: 'open' })
      .eq('id', payload.roundId);

    return new Response(
      JSON.stringify({
        error: 'Not enough participants',
        current: submissions.length,
        required: round.min_participants ?? 5,
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  // Run federated averaging (inlined since Deno can't import from packages)
  const totalSamples = submissions.reduce(
    (s: number, sub: { sample_count: number }) => s + sub.sample_count,
    0,
  );

  if (totalSamples === 0) {
    await serviceClient
      .from('federated_rounds')
      .update({ status: 'open' })
      .eq('id', payload.roundId);

    return new Response(JSON.stringify({ error: 'Total samples is zero' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const avgWeights = new Array(nWeights).fill(0);
  let avgBias = 0;

  for (const sub of submissions) {
    const w = sub.sample_count / totalSamples;
    const weights = sub.weights as number[];
    for (let i = 0; i < nWeights; i++) {
      avgWeights[i] += weights[i] * w;
    }
    avgBias += Number(sub.bias) * w;
  }

  const roundedWeights = avgWeights.map(
    (v: number) => Math.round(v * 10000) / 10000,
  );
  const roundedBias = Math.round(avgBias * 10000) / 10000;

  // Store result and mark complete
  await serviceClient
    .from('federated_rounds')
    .update({
      status: 'complete',
      aggregate_weights: roundedWeights,
      aggregate_bias: roundedBias,
      total_samples: totalSamples,
      participant_count: submissions.length,
      closed_at: new Date().toISOString(),
    })
    .eq('id', payload.roundId);

  // Store model version in federated_models table
  await serviceClient.from('federated_models').insert({
    target_dimension: round.target_dimension,
    model_version: round.round_number,
    weights: roundedWeights,
    bias: roundedBias,
    total_samples: totalSamples,
    participant_count: submissions.length,
    round_id: payload.roundId,
  });

  // Auto-create the next round so the system continuously cycles
  const nextRoundNumber = round.round_number + 1;
  await serviceClient.from('federated_rounds').insert({
    round_number: nextRoundNumber,
    target_dimension: round.target_dimension,
    status: 'open',
    min_participants: round.min_participants ?? 5,
  });

  return new Response(
    JSON.stringify({
      ok: true,
      averageWeights: roundedWeights,
      averageBias: roundedBias,
      totalSamples,
      participantCount: submissions.length,
      modelVersion: round.round_number,
      nextRoundNumber,
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
}

async function handleCreateRound(
  serviceClient: ReturnType<typeof createClient>,
  payload: CreateRoundPayload,
) {
  if (!payload.targetDimension || typeof payload.targetDimension !== 'string') {
    return new Response(JSON.stringify({ error: 'targetDimension is required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Find the latest round_number for this dimension
  const { data: latestRound } = await serviceClient
    .from('federated_rounds')
    .select('round_number')
    .eq('target_dimension', payload.targetDimension)
    .order('round_number', { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextRoundNumber = latestRound ? latestRound.round_number + 1 : 1;

  const { data: newRound, error: insertErr } = await serviceClient
    .from('federated_rounds')
    .insert({
      round_number: nextRoundNumber,
      target_dimension: payload.targetDimension,
      status: 'open',
      min_participants: payload.minParticipants ?? 5,
    })
    .select('id, round_number')
    .single();

  if (insertErr || !newRound) {
    return new Response(JSON.stringify({ error: insertErr?.message ?? 'Failed to create round' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return new Response(
    JSON.stringify({ ok: true, roundId: newRound.id, roundNumber: newRound.round_number }),
    { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
}

async function handleGetStatus(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  payload: GetStatusPayload,
) {
  let roundQuery;

  if (payload.roundId) {
    // Fetch specific round
    roundQuery = supabase
      .from('federated_rounds')
      .select('id, round_number, target_dimension, status, min_participants, participant_count, opened_at, closed_at')
      .eq('id', payload.roundId)
      .single();
  } else if (payload.targetDimension) {
    // Fetch latest round for the given dimension
    roundQuery = supabase
      .from('federated_rounds')
      .select('id, round_number, target_dimension, status, min_participants, participant_count, opened_at, closed_at')
      .eq('target_dimension', payload.targetDimension)
      .order('round_number', { ascending: false })
      .limit(1)
      .single();
  } else {
    return new Response(
      JSON.stringify({ error: 'Either roundId or targetDimension is required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  const { data: round, error: roundErr } = await roundQuery;

  if (roundErr || !round) {
    return new Response(JSON.stringify({ error: 'Round not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Check if current user has submitted
  const { data: submission } = await supabase
    .from('gradient_submissions')
    .select('id')
    .eq('round_id', round.id)
    .eq('user_id', userId)
    .maybeSingle();

  return new Response(
    JSON.stringify({
      round: {
        id: round.id,
        roundNumber: round.round_number,
        targetDimension: round.target_dimension,
        status: round.status,
        minParticipants: round.min_participants,
        participantCount: round.participant_count ?? 0,
        openedAt: round.opened_at,
        closedAt: round.closed_at,
      },
      hasSubmitted: !!submission,
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
}

async function handleGetResult(
  supabase: ReturnType<typeof createClient>,
  payload: GetResultPayload,
) {
  if (!payload.roundId) {
    return new Response(JSON.stringify({ error: 'roundId is required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { data: round, error: roundErr } = await supabase
    .from('federated_rounds')
    .select('id, round_number, target_dimension, status, aggregate_weights, aggregate_bias, total_samples, participant_count')
    .eq('id', payload.roundId)
    .single();

  if (roundErr || !round) {
    return new Response(JSON.stringify({ error: 'Round not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (round.status !== 'complete') {
    return new Response(JSON.stringify({ error: 'Round is not complete yet' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return new Response(
    JSON.stringify({
      roundId: round.id,
      modelVersion: round.round_number,
      targetDimension: round.target_dimension,
      weights: round.aggregate_weights,
      bias: round.aggregate_bias,
      totalSamples: round.total_samples,
      participantCount: round.participant_count,
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
}
