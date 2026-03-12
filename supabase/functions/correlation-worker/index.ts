import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

type DailyRow = {
  date: string;
  mood: number | null;
  dimension_scores:
    | Array<{
        dimension: string;
        score: number;
      }>
    | null;
};

type PairCorrelation = {
  keyA: string;
  keyB: string;
  correlation: number;
  sampleSize: number;
  bestLag: number;
  pValue: number;
  confidence: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function pearsonCorrelation(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length < 2) return 0;
  let sumX = 0;
  let sumY = 0;
  for (let i = 0; i < x.length; i++) {
    sumX += x[i];
    sumY += y[i];
  }
  const meanX = sumX / x.length;
  const meanY = sumY / y.length;
  let num = 0;
  let denX = 0;
  let denY = 0;
  for (let i = 0; i < x.length; i++) {
    const dx = x[i] - meanX;
    const dy = y[i] - meanY;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }
  if (denX === 0 || denY === 0) return 0;
  return num / Math.sqrt(denX * denY);
}

function laggedCorrelation(
  x: number[],
  y: number[],
  maxLag: number,
): { bestLag: number; bestCorrelation: number; overlap: number } {
  let bestLag = 0;
  let bestCorrelation = 0;
  let bestOverlap = 0;
  const n = Math.min(x.length, y.length);

  for (let lag = -maxLag; lag <= maxLag; lag++) {
    const xa: number[] = [];
    const ya: number[] = [];
    for (let i = 0; i < n; i++) {
      const j = i + lag;
      if (j < 0 || j >= n) continue;
      const xv = x[i];
      const yv = y[j];
      if (!Number.isFinite(xv) || !Number.isFinite(yv)) continue;
      xa.push(xv);
      ya.push(yv);
    }
    if (xa.length < 2) continue;
    const r = pearsonCorrelation(xa, ya);
    if (Math.abs(r) > Math.abs(bestCorrelation)) {
      bestCorrelation = r;
      bestLag = lag;
      bestOverlap = xa.length;
    }
  }

  return { bestLag, bestCorrelation, overlap: bestOverlap };
}

function erf(x: number): number {
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const p = 0.3275911;
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const t = 1 / (1 + p * ax);
  const y = 1 - (((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-ax * ax));
  return sign * y;
}

function normalCdf(x: number): number {
  return 0.5 * (1 + erf(x / Math.SQRT2));
}

function approximatePValue(r: number, n: number): number {
  if (n < 4) return 1;
  const clamped = clamp(r, -0.999999, 0.999999);
  const fisherZ = 0.5 * Math.log((1 + clamped) / (1 - clamped));
  const z = Math.abs(fisherZ) * Math.sqrt(n - 3);
  return clamp(2 * (1 - normalCdf(z)), 0, 1);
}

function confidenceScore(r: number, n: number, pValue: number): number {
  const effect = clamp((Math.abs(r) - 0.3) / 0.7, 0, 1);
  const sample = clamp((n - 14) / 30, 0, 1);
  const significance = clamp(1 - pValue, 0, 1);
  return clamp(0.45 * effect + 0.35 * significance + 0.2 * sample, 0, 1);
}

function insightText(pair: PairCorrelation): string {
  const relation = pair.correlation >= 0 ? 'move together' : 'move in opposite directions';
  const lagText =
    pair.bestLag === 0
      ? 'No meaningful delay was observed.'
      : `The strongest signal appears with a lag of ${pair.bestLag} day(s).`;
  return `${pair.keyA} and ${pair.keyB} ${relation} (r=${pair.correlation.toFixed(2)}, n=${pair.sampleSize}). Confidence ${Math.round(pair.confidence * 100)}%. ${lagText}`;
}

function buildSeries(rows: DailyRow[]): Record<string, number[]> {
  const byDate = new Map<string, Record<string, number>>();
  const dimensions = new Set<string>(['mood']);

  for (const row of rows) {
    const record: Record<string, number> = {};
    if (typeof row.mood === 'number') record.mood = row.mood;
    for (const item of row.dimension_scores ?? []) {
      record[item.dimension] = item.score;
      dimensions.add(item.dimension);
    }
    byDate.set(row.date, record);
  }

  const dates = Array.from(byDate.keys()).sort();
  const allDimensions = Array.from(dimensions);
  const series: Record<string, number[]> = {};
  for (const dim of allDimensions) series[dim] = [];

  for (const date of dates) {
    const row = byDate.get(date) ?? {};
    for (const dim of allDimensions) {
      const val = row[dim];
      series[dim].push(typeof val === 'number' ? val : Number.NaN);
    }
  }

  return series;
}

function computePairs(series: Record<string, number[]>): PairCorrelation[] {
  const keys = Object.keys(series).sort();
  const out: PairCorrelation[] = [];

  for (let i = 0; i < keys.length; i++) {
    for (let j = i + 1; j < keys.length; j++) {
      const keyA = keys[i];
      const keyB = keys[j];
      const x = series[keyA];
      const y = series[keyB];

      const cleanX: number[] = [];
      const cleanY: number[] = [];
      const n = Math.min(x.length, y.length);
      for (let k = 0; k < n; k++) {
        if (!Number.isFinite(x[k]) || !Number.isFinite(y[k])) continue;
        cleanX.push(x[k]);
        cleanY.push(y[k]);
      }

      const sampleSize = cleanX.length;
      const correlation = pearsonCorrelation(cleanX, cleanY);
      const lag = laggedCorrelation(cleanX, cleanY, 3);
      const pValue = approximatePValue(correlation, sampleSize);
      const confidence = confidenceScore(correlation, sampleSize, pValue);

      out.push({
        keyA,
        keyB,
        correlation,
        sampleSize,
        bestLag: lag.bestLag,
        pValue,
        confidence,
      });
    }
  }

  return out.filter((pair) => pair.sampleSize >= 14 && Math.abs(pair.correlation) >= 0.3 && pair.confidence >= 0.55);
}

Deno.serve(async () => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
    const cutoff = fourteenDaysAgo.toISOString().slice(0, 10);

    const { data: recent, error: recentError } = await supabase
      .from('checkins')
      .select('user_id')
      .gte('date', cutoff);

    if (recentError) throw recentError;
    const userIds = [...new Set((recent ?? []).map((r: { user_id: string }) => r.user_id))];
    let processedUsers = 0;

    for (const userId of userIds) {
      const { data: rows, error } = await supabase
        .from('checkins')
        .select('date, mood, dimension_scores(dimension, score)')
        .eq('user_id', userId)
        .gte('date', cutoff)
        .order('date', { ascending: true });

      if (error) continue;
      if (!rows || rows.length < 14) continue;

      const pairs = computePairs(buildSeries(rows as DailyRow[]));
      if (pairs.length === 0) continue;

      const deleteRes = await supabase
        .from('correlation_results')
        .delete()
        .eq('user_id', userId);
      if (deleteRes.error) continue;

      const inserts = pairs.map((pair) => ({
        user_id: userId,
        dimension_a: pair.keyA,
        dimension_b: pair.keyB,
        correlation_coefficient: pair.correlation,
        lag_days: pair.bestLag,
        sample_size: pair.sampleSize,
        confidence: pair.confidence,
        p_value: pair.pValue,
        insight_text: insightText(pair),
        computed_at: new Date().toISOString(),
      }));

      const insertRes = await supabase.from('correlation_results').insert(inserts);
      if (insertRes.error) continue;
      processedUsers += 1;
    }

    return new Response(
      JSON.stringify({
        processedUsers,
        totalCandidates: userIds.length,
      }),
      { headers: { 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
});
