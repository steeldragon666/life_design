import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

// ── Inlined types (Edge Functions can't import from @life-design/core) ──────

interface SHAPContribution {
  feature: string;
  value: number;
  shap_value: number;
  direction: 'positive' | 'negative';
}

// ── Feature categorization (inlined) ────────────────────────────────────────

const CATEGORY_PREFIXES: [string[], string][] = [
  [['sleep_'], 'Sleep'],
  [['exercise_', 'steps_'], 'Exercise'],
  [['mood_', 'valence_'], 'Mood'],
  [['stress_', 'hrv_'], 'Stress'],
  [['social_', 'calendar_'], 'Social'],
  [['weather_', 'sunlight_'], 'Environment'],
  [['screen_'], 'Screen Time'],
  [['journal_'], 'Journaling'],
];

function toTitleCase(snakeName: string): string {
  return snakeName
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function friendlyName(featureName: string): string {
  if (featureName.includes('*')) {
    return featureName
      .split('*')
      .map((p) => toTitleCase(p.trim()))
      .join(' * ');
  }
  return toTitleCase(featureName);
}

function formatContrib(c: SHAPContribution): string {
  const sign = c.shap_value >= 0 ? '+' : '';
  const rounded = Math.round(c.shap_value * 10) / 10;
  return `${friendlyName(c.feature)} (${sign}${rounded})`;
}

function generateSummary(
  predictedValue: number,
  targetDimension: string,
  topPositive: SHAPContribution[],
  topNegative: SHAPContribution[],
): string {
  const score = Math.round(predictedValue * 10) / 10;
  const hasPos = topPositive.length > 0;
  const hasNeg = topNegative.length > 0;

  if (!hasPos && !hasNeg) {
    return `Your ${targetDimension} score of ${score} is close to your baseline.`;
  }

  const posText = topPositive.map(formatContrib).join(', ');
  const negText = topNegative.map(formatContrib).join(', ');

  if (hasPos && hasNeg) {
    return `Your ${targetDimension} score of ${score} was mainly driven by ${posText}, partially offset by ${negText}.`;
  }
  if (hasPos) {
    return `Your ${targetDimension} score of ${score} was mainly driven by ${posText}.`;
  }
  return `Your ${targetDimension} score of ${score} was mainly pulled down by ${negText}.`;
}

// ── Resolve interaction feature values ──────────────────────────────────────

function resolveFeatureValue(
  featureName: string,
  features: Record<string, number>,
  interactionFeatures?: string[],
): number {
  if (interactionFeatures?.includes(featureName) && featureName.includes('*')) {
    return featureName
      .split('*')
      .reduce((product, part) => product * (features[part.trim()] ?? 0), 1);
  }
  return features[featureName] ?? 0;
}

// ── Main handler ────────────────────────────────────────────────────────────

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
    // ── Auth ─────────────────────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Auth client — validates JWT properly
    const authClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    // Service client — for privileged DB writes
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser();
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

    const predictionDate = new Date().toISOString().slice(0, 10);

    // ── Check cache: existing explanation for same user+dimension+date ──
    const { data: cached } = await serviceClient
      .from('shap_explanations')
      .select('*')
      .eq('user_id', userId)
      .eq('target_dimension', targetDimension)
      .eq('prediction_date', predictionDate)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (cached) {
      // Return cached result — parse stored contributions for top arrays
      const contributions = cached.feature_contributions as SHAPContribution[];
      const topPositive = contributions
        .filter((c) => c.shap_value > 0)
        .sort((a, b) => b.shap_value - a.shap_value)
        .slice(0, 3);
      const topNegative = contributions
        .filter((c) => c.shap_value < 0)
        .sort((a, b) => a.shap_value - b.shap_value)
        .slice(0, 3);

      return new Response(
        JSON.stringify({
          predicted_value: cached.predicted_value,
          base_value: cached.base_value,
          feature_contributions: contributions,
          top_positive: topPositive,
          top_negative: topNegative,
          summary: generateSummary(
            Number(cached.predicted_value),
            targetDimension,
            topPositive,
            topNegative,
          ),
          cached: true,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        },
      );
    }

    // ── Load latest model artifact ───────────────────────────────────────
    const { data: model, error: modelErr } = await serviceClient
      .from('model_artifacts')
      .select(
        'weights, intercept, feature_names, feature_stats, interaction_features',
      )
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

    const {
      weights,
      intercept,
      feature_names: featureNames,
      interaction_features: interactionFeatures,
    } = model as {
      weights: number[];
      intercept: number;
      feature_names: string[];
      feature_stats: Record<string, { mean: number; std: number }> | null;
      interaction_features: string[] | null;
    };

    // ── Compute SHAP values ──────────────────────────────────────────────
    const featureContributions: SHAPContribution[] = [];

    let predictedValue = intercept;

    for (let i = 0; i < featureNames.length; i++) {
      const featureName = featureNames[i];
      const featureValue = resolveFeatureValue(
        featureName,
        features,
        interactionFeatures ?? undefined,
      );
      const shapValue = weights[i] * featureValue;

      predictedValue += shapValue;

      featureContributions.push({
        feature: featureName,
        value: featureValue,
        shap_value: Math.round(shapValue * 1000) / 1000,
        direction: shapValue >= 0 ? 'positive' : 'negative',
      });
    }

    // Sort by absolute SHAP value descending
    featureContributions.sort(
      (a, b) => Math.abs(b.shap_value) - Math.abs(a.shap_value),
    );

    const topPositive = featureContributions
      .filter((c) => c.shap_value > 0)
      .sort((a, b) => b.shap_value - a.shap_value)
      .slice(0, 3);

    const topNegative = featureContributions
      .filter((c) => c.shap_value < 0)
      .sort((a, b) => a.shap_value - b.shap_value)
      .slice(0, 3);

    const roundedPredicted = Math.round(predictedValue * 10) / 10;
    const roundedBase = Math.round(intercept * 10) / 10;

    const summary = generateSummary(
      predictedValue,
      targetDimension,
      topPositive,
      topNegative,
    );

    // ── Store explanation ────────────────────────────────────────────────
    const { error: insertErr } = await serviceClient
      .from('shap_explanations')
      .insert({
        user_id: userId,
        prediction_date: predictionDate,
        target_dimension: targetDimension,
        predicted_value: roundedPredicted,
        base_value: roundedBase,
        feature_contributions: featureContributions,
      });

    if (insertErr) {
      return new Response(JSON.stringify({ error: insertErr.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    return new Response(
      JSON.stringify({
        predicted_value: roundedPredicted,
        base_value: roundedBase,
        feature_contributions: featureContributions,
        top_positive: topPositive,
        top_negative: topNegative,
        summary,
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
