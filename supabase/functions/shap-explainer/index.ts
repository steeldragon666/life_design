import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // ── CORS preflight ─────────────────────────────────────────────────────
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders });
  }

  // ── POST only ──────────────────────────────────────────────────────────
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // ── Auth ─────────────────────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // ── Parse body ───────────────────────────────────────────────────────
    const { userId, targetDimension, features } = (await req.json()) as {
      userId: string;
      targetDimension: string;
      features: Record<string, number>;
    };

    if (!userId || !targetDimension || !features) {
      return new Response(
        JSON.stringify({
          error: 'userId, targetDimension, and features are required',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        },
      );
    }

    if (user.id !== userId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // ── Load latest model artifact ───────────────────────────────────────
    const { data: model, error: modelErr } = await supabase
      .from('model_artifacts')
      .select('weights, intercept, feature_names')
      .eq('user_id', userId)
      .eq('target_dimension', targetDimension)
      .order('model_version', { ascending: false })
      .limit(1)
      .single();

    if (modelErr || !model) {
      return new Response(
        JSON.stringify({
          error: modelErr?.message ?? 'No model artifact found',
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        },
      );
    }

    const { weights, intercept, feature_names: featureNames } = model as {
      weights: number[];
      intercept: number;
      feature_names: string[];
    };

    // ── Compute SHAP values ──────────────────────────────────────────────
    // For a linear model, the marginal contribution of each feature is:
    //   shap_i = weight_i * feature_i
    // The base value is the intercept (average prediction when all features = 0).
    const featureContributions: {
      feature: string;
      value: number;
      shap_value: number;
    }[] = [];

    let predictedValue = intercept;

    for (let i = 0; i < featureNames.length; i++) {
      const featureName = featureNames[i];
      const featureValue = features[featureName] ?? 0;
      const shapValue = weights[i] * featureValue;

      predictedValue += shapValue;

      featureContributions.push({
        feature: featureName,
        value: featureValue,
        shap_value: Math.round(shapValue * 1000) / 1000,
      });
    }

    // Sort by absolute SHAP value descending
    featureContributions.sort(
      (a, b) => Math.abs(b.shap_value) - Math.abs(a.shap_value),
    );

    // ── Store explanation ────────────────────────────────────────────────
    const predictionDate = new Date().toISOString().slice(0, 10);

    const { error: insertErr } = await supabase
      .from('shap_explanations')
      .insert({
        user_id: userId,
        prediction_date: predictionDate,
        target_dimension: targetDimension,
        predicted_value: Math.round(predictedValue * 10) / 10,
        base_value: Math.round(intercept * 10) / 10,
        feature_contributions: featureContributions,
      });

    if (insertErr) {
      return new Response(
        JSON.stringify({ error: insertErr.message }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        },
      );
    }

    return new Response(
      JSON.stringify({
        predicted_value: Math.round(predictedValue * 10) / 10,
        base_value: Math.round(intercept * 10) / 10,
        feature_contributions: featureContributions,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      },
    );
  }
});
