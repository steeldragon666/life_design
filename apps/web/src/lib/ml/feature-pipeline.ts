import { db } from '@/lib/db';
import { NormalisationStore } from './normalization-store';
import type {
  IFeatureExtractor,
  NormalisedMLFeatures,
  FeatureLogRecord,
} from './types';

/**
 * The 12 numeric features that go through NormalisationStore sigmoid mapping.
 */
const NUMERIC_FEATURES: (keyof NormalisedMLFeatures)[] = [
  'sleep_duration_score',
  'sleep_quality_score',
  'physical_strain',
  'recovery_status',
  'meeting_load',
  'context_switching_penalty',
  'deep_work_opportunity',
  'after_hours_work',
  'digital_fatigue',
  'doomscroll_index',
  'audio_valence',
  'audio_energy',
];

/**
 * Default values used when a feature is missing (imputation).
 * Numeric features default to 0.5, booleans to false, cyclic to 0.
 */
const DEFAULTS: NormalisedMLFeatures = {
  sleep_duration_score: 0.5,
  sleep_quality_score: 0.5,
  physical_strain: 0.5,
  recovery_status: 0.5,
  meeting_load: 0.5,
  context_switching_penalty: 0.5,
  deep_work_opportunity: 0.5,
  after_hours_work: 0.5,
  digital_fatigue: 0.5,
  doomscroll_index: 0.5,
  audio_valence: 0.5,
  audio_energy: 0.5,
  day_of_week_sin: 0,
  day_of_week_cos: 0,
  is_weekend: false,
  season_sprint: 0,
  season_recharge: 0,
  season_exploration: 0,
};

/**
 * Encode the day-of-week as cyclic sin/cos values.
 * Uses 2*PI/7 period so Monday(1) through Sunday(0) form a circle.
 */
function cyclicDayOfWeek(date: Date): { sin: number; cos: number } {
  const day = date.getDay(); // 0=Sunday .. 6=Saturday
  const angle = (2 * Math.PI * day) / 7;
  return {
    sin: Math.sin(angle),
    cos: Math.cos(angle),
  };
}

/**
 * Determine if a date falls on a weekend (Saturday or Sunday).
 */
function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

/**
 * Look up current active season and return one-hot encoding.
 * Defaults to Maintenance (all zeros) if no active season.
 */
async function getSeasonEncoding(): Promise<{
  season_sprint: number;
  season_recharge: number;
  season_exploration: number;
}> {
  const activeSeason = await db.seasons
    .where('isActive')
    .equals(1)
    .first();

  if (!activeSeason) {
    return { season_sprint: 0, season_recharge: 0, season_exploration: 0 };
  }

  return {
    season_sprint: activeSeason.name === 'Sprint' ? 1 : 0,
    season_recharge: activeSeason.name === 'Recharge' ? 1 : 0,
    season_exploration: activeSeason.name === 'Exploration' ? 1 : 0,
  };
}

/**
 * Collects raw signal data from check-ins and connected app data
 * within the lookback window for the given date.
 */
async function collectRawSignals(
  date: Date,
  _lookbackDays: number,
): Promise<Partial<NormalisedMLFeatures>> {
  const dateStr = date.toISOString().slice(0, 10);
  const checkIn = await db.checkIns.where('date').equals(dateStr).first();

  const partial: Partial<NormalisedMLFeatures> = {};

  if (checkIn) {
    if (checkIn.sleep !== undefined) {
      // Map sleep hours (0-12) to a raw score suitable for normalisation
      partial.sleep_duration_score = checkIn.sleep;
    }
    if (checkIn.energy !== undefined) {
      partial.recovery_status = checkIn.energy;
    }
  }

  // Spotify reflections for the date
  const spotifyReflection = await db.spotifyReflections
    .where('date')
    .equals(dateStr)
    .first();

  if (spotifyReflection) {
    partial.audio_valence = spotifyReflection.audioValence;
    partial.audio_energy = spotifyReflection.audioEnergy;
  }

  return partial;
}

export class FeaturePipeline implements IFeatureExtractor {
  private normStore = new NormalisationStore();

  imputeMissing(raw: Partial<NormalisedMLFeatures>): NormalisedMLFeatures {
    const result = { ...DEFAULTS };

    for (const key of Object.keys(DEFAULTS) as (keyof NormalisedMLFeatures)[]) {
      if (raw[key] !== undefined) {
        // TypeScript needs help here since the union type is tricky
        (result as Record<string, number | boolean>)[key] = raw[key] as number | boolean;
      }
    }

    return result;
  }

  async extract(date: Date, lookbackDays: number = 7): Promise<NormalisedMLFeatures> {
    // 1. Collect raw signals from DB
    const rawSignals = await collectRawSignals(date, lookbackDays);

    // 2. Normalise numeric features through the NormalisationStore
    const normalisedPartial: Partial<NormalisedMLFeatures> = {};
    const imputedFields: string[] = [];

    for (const feature of NUMERIC_FEATURES) {
      const rawValue = rawSignals[feature] as number | undefined;
      if (rawValue !== undefined) {
        normalisedPartial[feature] = await this.normStore.normalise(feature, rawValue);
        // Update running stats
        await this.normStore.updateStats(feature, rawValue);
      } else {
        imputedFields.push(feature);
      }
    }

    // 3. Cyclic time encoding
    const cyclic = cyclicDayOfWeek(date);
    normalisedPartial.day_of_week_sin = cyclic.sin;
    normalisedPartial.day_of_week_cos = cyclic.cos;

    // 4. Weekend derivation
    normalisedPartial.is_weekend = isWeekend(date);

    // 5. Season encoding
    const seasonEncoding = await getSeasonEncoding();
    normalisedPartial.season_sprint = seasonEncoding.season_sprint;
    normalisedPartial.season_recharge = seasonEncoding.season_recharge;
    normalisedPartial.season_exploration = seasonEncoding.season_exploration;

    // 6. Impute missing features
    const features = this.imputeMissing(normalisedPartial);

    // 7. Compute feature confidence
    const featureConfidence = 1 - imputedFields.length / NUMERIC_FEATURES.length;

    // 8. Save FeatureLogRecord to Dexie
    const logRecord: FeatureLogRecord = {
      date: date.toISOString().slice(0, 10),
      features,
      imputedFields,
      featureConfidence,
      extractedAt: Date.now(),
    };
    await db.featureLogs.put(logRecord);

    return features;
  }
}

/**
 * Helper to retrieve the feature confidence for a given date.
 * Returns 0 if no feature log exists for that date.
 */
export async function getFeatureConfidence(date: Date): Promise<number> {
  const dateStr = date.toISOString().slice(0, 10);
  const log = await db.featureLogs.get(dateStr);
  return log?.featureConfidence ?? 0;
}
