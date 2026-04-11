import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
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

type RequestPayload = SubmitPayload | AggregatePayload;

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

    if (body.action === 'submit') {
      return await handleSubmit(supabase, user.id, body as SubmitPayload);
    } else if (body.action === 'aggregate') {
      return await handleAggregate(serviceClient, body as AggregatePayload);
    } else {
      return new Response(
        JSON.stringify({ error: 'Unknown action. Use "submit" or "aggregate".' }),
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

  // Mark as aggregating
  await serviceClient
    .from('federated_rounds')
    .update({ status: 'aggregating' })
    .eq('id', payload.roundId);

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

  const nWeights = (submissions[0].weights as number[]).length;
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

  return new Response(
    JSON.stringify({
      ok: true,
      averageWeights: roundedWeights,
      averageBias: roundedBias,
      totalSamples,
      participantCount: submissions.length,
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
}
