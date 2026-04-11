import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

// ─── Matrix helpers (small matrices, normal-equation ridge regression) ────────

/** Transpose an m×n matrix. */
function transpose(m: number[][]): number[][] {
  const rows = m.length;
  const cols = m[0].length;
  const t: number[][] = Array.from({ length: cols }, () => new Array(rows));
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      t[j][i] = m[i][j];
    }
  }
  return t;
}

/** Multiply A (m×n) by B (n×p). */
function matMul(a: number[][], b: number[][]): number[][] {
  const m = a.length;
  const n = b.length;
  const p = b[0].length;
  const result: number[][] = Array.from({ length: m }, () =>
    new Array(p).fill(0),
  );
  for (let i = 0; i < m; i++) {
    for (let k = 0; k < n; k++) {
      const aik = a[i][k];
      for (let j = 0; j < p; j++) {
        result[i][j] += aik * b[k][j];
      }
    }
  }
  return result;
}

/** Add λ·I to a square matrix (in-place). */
function addRidge(m: number[][], lambda: number): void {
  for (let i = 0; i < m.length; i++) {
    m[i][i] += lambda;
  }
}

/**
 * Invert a square matrix using Gauss-Jordan elimination.
 * Returns null if the matrix is singular.
 */
function invert(matrix: number[][]): number[][] | null {
  const n = matrix.length;
  // Augment with identity
  const aug: number[][] = matrix.map((row, i) => {
    const id = new Array(n).fill(0);
    id[i] = 1;
    return [...row, ...id];
  });

  for (let col = 0; col < n; col++) {
    // Partial pivot
    let maxRow = col;
    let maxVal = Math.abs(aug[col][col]);
    for (let row = col + 1; row < n; row++) {
      const v = Math.abs(aug[row][col]);
      if (v > maxVal) {
        maxVal = v;
        maxRow = row;
      }
    }
    if (maxVal < 1e-12) return null; // singular
    if (maxRow !== col) {
      [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];
    }

    const pivot = aug[col][col];
    for (let j = 0; j < 2 * n; j++) aug[col][j] /= pivot;

    for (let row = 0; row < n; row++) {
      if (row === col) continue;
      const factor = aug[row][col];
      for (let j = 0; j < 2 * n; j++) {
        aug[row][j] -= factor * aug[col][j];
      }
    }
  }

  return aug.map((row) => row.slice(n));
}

/** Multiply matrix A (m×n) by column vector v (n×1), returns m-length array. */
function matVecMul(a: number[][], v: number[]): number[] {
  return a.map((row) => row.reduce((s, val, j) => s + val * v[j], 0));
}

// ─── Edge function ───────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  try {
    // ── Auth ──────────────────────────────────────────────────────────────
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

    // ── Parse body ────────────────────────────────────────────────────────
    const { userId, targetDimension } = await req.json();
    const minSamples = 30; // Enforced server-side — not caller-controlled

    if (!userId || !targetDimension) {
      return new Response(
        JSON.stringify({ error: 'userId and targetDimension are required' }),
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

    // ── Fetch feature history ─────────────────────────────────────────────
    const { data: rows, error: fetchErr } = await serviceClient
      .from('feature_store')
      .select('feature, value, recorded_at')
      .eq('user_id', userId)
      .order('recorded_at', { ascending: true });

    if (fetchErr) {
      return new Response(JSON.stringify({ error: fetchErr.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    if (!rows || rows.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'No feature data available',
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        },
      );
    }

    // ── Build feature matrix ──────────────────────────────────────────────
    // Group rows by recorded_at timestamp to form observation vectors.
    // The target is the feature whose name equals targetDimension.
    const byTime = new Map<
      string,
      { features: Map<string, number>; target?: number }
    >();

    for (const row of rows) {
      const ts = row.recorded_at as string;
      if (!byTime.has(ts)) {
        byTime.set(ts, { features: new Map() });
      }
      const entry = byTime.get(ts)!;
      if (row.feature === targetDimension) {
        entry.target = row.value as number;
      } else {
        entry.features.set(row.feature as string, row.value as number);
      }
    }

    // Collect feature names from all observations
    const featureSet = new Set<string>();
    for (const entry of byTime.values()) {
      for (const name of entry.features.keys()) {
        featureSet.add(name);
      }
    }
    const featureNames = [...featureSet].sort();

    if (featureNames.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'No predictor features found' }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        },
      );
    }

    // Build X and y, keeping only observations that have a target value
    const X: number[][] = [];
    const y: number[] = [];

    for (const entry of byTime.values()) {
      if (entry.target === undefined) continue;
      const row = featureNames.map((f) => entry.features.get(f) ?? 0);
      X.push(row);
      y.push(entry.target);
    }

    if (X.length < minSamples) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Insufficient samples: ${X.length} < ${minSamples}`,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        },
      );
    }

    // ── Add bias column (intercept) ───────────────────────────────────────
    const Xb = X.map((row) => [...row, 1]); // append 1 for intercept

    // ── Ridge regression: w = (X^T X + λI)^(-1) X^T y ────────────────────
    const lambda = 0.01;
    const Xt = transpose(Xb);
    const XtX = matMul(Xt, Xb);
    addRidge(XtX, lambda);
    const XtXinv = invert(XtX);

    if (!XtXinv) {
      return new Response(
        JSON.stringify({ success: false, error: 'Singular matrix — cannot train' }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        },
      );
    }

    // X^T y as column vector → flatten
    const Xty = matVecMul(Xt, y);
    const w = matVecMul(XtXinv, Xty);

    const weights = w.slice(0, featureNames.length);
    const intercept = w[featureNames.length];

    // ── Training metrics ──────────────────────────────────────────────────
    const n = y.length;
    const yMean = y.reduce((a, b) => a + b, 0) / n;
    let ssRes = 0;
    let ssTot = 0;
    for (let i = 0; i < n; i++) {
      const pred = Xb[i].reduce((s, v, j) => s + v * w[j], 0);
      ssRes += (y[i] - pred) ** 2;
      ssTot += (y[i] - yMean) ** 2;
    }
    const mse = ssRes / n;
    const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0;

    // ── Feature importance (normalised absolute weights) ──────────────────
    const absWeights = weights.map(Math.abs);
    const absSum = absWeights.reduce((a, b) => a + b, 0) || 1;
    const featureImportance: Record<string, number> = {};
    featureNames.forEach((name, i) => {
      featureImportance[name] =
        Math.round((absWeights[i] / absSum) * 10000) / 10000;
    });

    // ── Determine next model version ──────────────────────────────────────
    const { data: latestModel } = await serviceClient
      .from('model_artifacts')
      .select('model_version')
      .eq('user_id', userId)
      .eq('target_dimension', targetDimension)
      .order('model_version', { ascending: false })
      .limit(1)
      .single();

    const modelVersion = latestModel ? latestModel.model_version + 1 : 1;

    // ── Persist artifact ──────────────────────────────────────────────────
    const { error: insertErr } = await serviceClient
      .from('model_artifacts')
      .insert({
        user_id: userId,
        model_version: modelVersion,
        target_dimension: targetDimension,
        feature_names: featureNames,
        weights,
        intercept,
        training_metrics: {
          mse: Math.round(mse * 1e6) / 1e6,
          r2: Math.round(r2 * 1e6) / 1e6,
          sampleCount: n,
          featureCount: featureNames.length,
        },
        feature_importance: featureImportance,
      });

    if (insertErr) {
      return new Response(JSON.stringify({ success: false, error: insertErr.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const artifact = {
      userId,
      modelVersion,
      createdAt: new Date().toISOString(),
      featureNames,
      weights,
      intercept,
      trainingMetrics: {
        mse: Math.round(mse * 1e6) / 1e6,
        r2: Math.round(r2 * 1e6) / 1e6,
        sampleCount: n,
        featureCount: featureNames.length,
      },
      featureImportance,
    };

    return new Response(JSON.stringify({ success: true, artifact }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
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
