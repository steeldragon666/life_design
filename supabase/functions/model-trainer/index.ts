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

    // ── Feature standardization (z-score) ─────────────────────────────────
    const n = X.length;
    const numFeatures = featureNames.length;
    const featureMeans = new Array(numFeatures).fill(0);
    const featureStds = new Array(numFeatures).fill(0);

    // Compute means
    for (let j = 0; j < numFeatures; j++) {
      let sum = 0;
      for (let i = 0; i < n; i++) sum += X[i][j];
      featureMeans[j] = sum / n;
    }

    // Compute standard deviations
    for (let j = 0; j < numFeatures; j++) {
      let sumSq = 0;
      for (let i = 0; i < n; i++) {
        sumSq += (X[i][j] - featureMeans[j]) ** 2;
      }
      featureStds[j] = Math.sqrt(sumSq / n);
      if (featureStds[j] < 1e-12) featureStds[j] = 1; // avoid division by zero
    }

    // Build featureStats record
    const featureStats: Record<string, { mean: number; std: number }> = {};
    featureNames.forEach((name, j) => {
      featureStats[name] = {
        mean: Math.round(featureMeans[j] * 1e6) / 1e6,
        std: Math.round(featureStds[j] * 1e6) / 1e6,
      };
    });

    // Standardize X in-place
    const Xstd = X.map((row) =>
      row.map((v, j) => (v - featureMeans[j]) / featureStds[j]),
    );

    // ── Generate interaction features for top-5 important base features ───
    // First do a preliminary training to determine importance, then add interactions.
    // For efficiency, we compute initial absolute correlations with y as a proxy.
    const yMean = y.reduce((a, b) => a + b, 0) / n;
    const correlations: Array<{ idx: number; corr: number }> = [];
    for (let j = 0; j < numFeatures; j++) {
      let num = 0;
      let denX = 0;
      let denY = 0;
      for (let i = 0; i < n; i++) {
        const dx = Xstd[i][j];
        const dy = y[i] - yMean;
        num += dx * dy;
        denX += dx * dx;
        denY += dy * dy;
      }
      const den = Math.sqrt(denX * denY);
      correlations.push({ idx: j, corr: den > 0 ? Math.abs(num / den) : 0 });
    }
    correlations.sort((a, b) => b.corr - a.corr);
    const topIndices = correlations.slice(0, 5).map((c) => c.idx);

    // Generate pairwise interaction terms for top features
    const interactionFeatureNames: string[] = [];
    const interactionColumns: number[][] = [];
    for (let ii = 0; ii < topIndices.length; ii++) {
      for (let jj = ii + 1; jj < topIndices.length; jj++) {
        const iIdx = topIndices[ii];
        const jIdx = topIndices[jj];
        const name = `${featureNames[iIdx]}*${featureNames[jIdx]}`;
        interactionFeatureNames.push(name);
        const col: number[] = [];
        for (let i = 0; i < n; i++) {
          col.push(Xstd[i][iIdx] * Xstd[i][jIdx]);
        }
        interactionColumns.push(col);
      }
    }

    // Augment Xstd with interaction columns
    const allFeatureNames = [...featureNames, ...interactionFeatureNames];
    const Xaug = Xstd.map((row, i) => {
      const interactionVals = interactionColumns.map((col) => col[i]);
      return [...row, ...interactionVals];
    });

    // ── Add bias column (intercept) ───────────────────────────────────────
    const Xb = Xaug.map((row) => [...row, 1]); // append 1 for intercept

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

    const weights = w.slice(0, allFeatureNames.length);
    const intercept = w[allFeatureNames.length];

    // ── Training metrics ──────────────────────────────────────────────────
    let ssRes = 0;
    let ssTot = 0;
    for (let i = 0; i < n; i++) {
      const pred = Xb[i].reduce((s, v, j) => s + v * w[j], 0);
      ssRes += (y[i] - pred) ** 2;
      ssTot += (y[i] - yMean) ** 2;
    }
    const mse = ssRes / n;
    const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0;

    // ── Cross-validation (5-fold) ─────────────────────────────────────────
    const kFolds = 5;
    const foldSize = Math.floor(n / kFolds);
    let cvSsRes = 0;
    let cvSsTot = 0;
    let cvMseSum = 0;

    for (let fold = 0; fold < kFolds; fold++) {
      const valStart = fold * foldSize;
      const valEnd = fold === kFolds - 1 ? n : valStart + foldSize;

      // Split into train/val
      const trainXb: number[][] = [];
      const trainY: number[] = [];
      const valXb: number[][] = [];
      const valY: number[] = [];

      for (let i = 0; i < n; i++) {
        if (i >= valStart && i < valEnd) {
          valXb.push(Xb[i]);
          valY.push(y[i]);
        } else {
          trainXb.push(Xb[i]);
          trainY.push(y[i]);
        }
      }

      // Train on fold
      const foldXt = transpose(trainXb);
      const foldXtX = matMul(foldXt, trainXb);
      addRidge(foldXtX, lambda);
      const foldInv = invert(foldXtX);
      if (!foldInv) continue; // skip singular folds

      const foldXty = matVecMul(foldXt, trainY);
      const foldW = matVecMul(foldInv, foldXty);

      // Evaluate on validation set
      const valYMean = valY.reduce((a, b) => a + b, 0) / valY.length;
      let foldSsRes = 0;
      let foldSsTot = 0;
      for (let i = 0; i < valY.length; i++) {
        const pred = valXb[i].reduce((s, v, j) => s + v * foldW[j], 0);
        foldSsRes += (valY[i] - pred) ** 2;
        foldSsTot += (valY[i] - valYMean) ** 2;
      }
      cvSsRes += foldSsRes;
      cvSsTot += foldSsTot;
      cvMseSum += foldSsRes / valY.length;
    }

    const cvR2 = cvSsTot > 0 ? 1 - cvSsRes / cvSsTot : 0;
    const cvMSE = cvMseSum / kFolds;
    const cvMetrics = {
      cvR2: Math.round(cvR2 * 1e6) / 1e6,
      cvMSE: Math.round(cvMSE * 1e6) / 1e6,
      folds: kFolds,
    };

    // ── Feature importance (normalised absolute weights) ──────────────────
    const absWeights = weights.map(Math.abs);
    const absSum = absWeights.reduce((a, b) => a + b, 0) || 1;
    const featureImportance: Record<string, number> = {};
    allFeatureNames.forEach((name, i) => {
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
        feature_names: allFeatureNames,
        weights,
        intercept,
        training_metrics: {
          mse: Math.round(mse * 1e6) / 1e6,
          r2: Math.round(r2 * 1e6) / 1e6,
          sampleCount: n,
          featureCount: allFeatureNames.length,
        },
        feature_importance: featureImportance,
        feature_stats: featureStats,
        interaction_features: interactionFeatureNames,
        cv_metrics: cvMetrics,
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
      featureNames: allFeatureNames,
      weights,
      intercept,
      trainingMetrics: {
        mse: Math.round(mse * 1e6) / 1e6,
        r2: Math.round(r2 * 1e6) / 1e6,
        sampleCount: n,
        featureCount: allFeatureNames.length,
      },
      featureImportance,
      featureStats,
      interactionFeatures: interactionFeatureNames,
      cvMetrics: cvMetrics,
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
